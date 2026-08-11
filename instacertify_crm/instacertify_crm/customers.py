# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

"""IC Customer master — one complete customer record across leads/quotes/projects."""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import timedelta

import frappe
from frappe.utils import flt, getdate, now_datetime, today


def upsert_customer_from_party(
	*,
	email: str | None,
	customer_name: str | None = None,
	company: str | None = None,
	phone: str | None = None,
	country: str | None = None,
	state: str | None = None,
	lead: str | None = None,
):
	"""Create or update IC Customer keyed by email."""
	email = (email or "").strip().lower()
	if not email or "@" not in email:
		return None
	if not frappe.db.exists("DocType", "IC Customer"):
		return None

	name = frappe.db.get_value("IC Customer", {"email": email}, "name")
	if name:
		doc = frappe.get_doc("IC Customer", name)
		changed = False
		for field, value in {
			"customer_name": customer_name,
			"company": company,
			"phone": phone,
			"country": country,
			"state": state,
		}.items():
			if value and not doc.get(field):
				doc.set(field, value)
				changed = True
		if lead and not doc.primary_lead:
			doc.primary_lead = lead
			changed = True
		doc.refresh_metrics(save=False)
		doc.save(ignore_permissions=True)
		return doc

	doc = frappe.get_doc(
		{
			"doctype": "IC Customer",
			"company": company or customer_name or email.split("@")[0],
			"customer_name": customer_name or company or email,
			"email": email,
			"phone": phone,
			"country": country or "India",
			"state": state,
			"primary_lead": lead,
			"status": "Active",
			"last_activity_on": now_datetime(),
		}
	)
	doc.insert(ignore_permissions=True)
	return doc


def sync_from_lead(doc, method=None):
	upsert_customer_from_party(
		email=doc.email,
		customer_name=doc.customer_name,
		company=doc.company,
		phone=doc.phone,
		country=doc.country,
		state=doc.state,
		lead=doc.name,
	)


def sync_from_quote(doc, method=None):
	upsert_customer_from_party(
		email=doc.email,
		customer_name=doc.customer_name,
		company=doc.company,
		phone=doc.phone,
		country=doc.country,
		state=doc.state,
		lead=doc.lead,
	)


def sync_from_project(doc, method=None):
	upsert_customer_from_party(
		email=doc.email,
		customer_name=doc.customer_name,
		company=doc.company,
		phone=doc.phone,
		country=doc.country,
		state=doc.state,
		lead=doc.lead,
	)


def backfill_customers():
	"""Create IC Customer rows from existing leads / quotes / projects."""
	if not frappe.db.exists("DocType", "IC Customer"):
		return
	seen = set()
	for doctype in ("IC Lead", "IC Quote", "IC Customer Project"):
		if not frappe.db.exists("DocType", doctype):
			continue
		rows = frappe.get_all(
			doctype,
			fields=["email", "customer_name", "company", "phone", "country", "state", "name"],
			filters={"email": ["is", "set"]},
			limit_page_length=5000,
		)
		for row in rows:
			email = (row.email or "").strip().lower()
			if not email or email in seen:
				continue
			seen.add(email)
			lead = row.name if doctype == "IC Lead" else None
			if doctype != "IC Lead":
				lead = frappe.db.get_value("IC Lead", {"email": email}, "name")
			try:
				upsert_customer_from_party(
					email=email,
					customer_name=row.customer_name,
					company=row.company,
					phone=row.phone,
					country=row.country,
					state=row.state,
					lead=lead,
				)
			except Exception:
				frappe.log_error(title=f"IC Customer backfill failed for {email}")
	frappe.db.commit()


@frappe.whitelist(methods=["POST"])
def refresh_customer(customer: str):
	frappe.has_permission("IC Customer", "write", throw=True)
	doc = frappe.get_doc("IC Customer", customer)
	doc.refresh_metrics(save=False)
	doc.save(ignore_permissions=True)
	return {"name": doc.name, "active_projects": doc.active_projects, "lifetime_value": doc.lifetime_value}


@frappe.whitelist(methods=["GET"])
def get_customer_chart_data(customer: str):
	frappe.has_permission("IC Customer", "read", throw=True)
	doc = frappe.get_doc("IC Customer", customer)
	email = doc.email

	projects = frappe.get_all(
		"IC Customer Project",
		filters={"email": email},
		fields=["name", "status", "project_value", "creation", "last_activity_on"],
		order_by="creation asc",
	)
	quotes = frappe.get_all(
		"IC Quote",
		filters={"email": email},
		fields=["name", "status", "total_revenue", "creation"],
	)
	delivery_filters = {}
	meta = frappe.get_meta("IC Delivery Record")
	if meta.has_field("email"):
		delivery_filters = {"email": email}
	elif projects:
		delivery_filters = {"project": ["in", [p.name for p in projects]]}
	else:
		delivery_filters = {"name": ["in", ["__none__"]]}
	deliveries = frappe.get_all(
		"IC Delivery Record",
		filters=delivery_filters,
		fields=["name", "delivered_on", "creation"],
		limit_page_length=200,
	)

	status_counter = Counter(p.status or "Unknown" for p in projects)
	status_chart = {
		"labels": list(status_counter.keys()),
		"values": [status_counter[k] for k in status_counter],
	}

	value_chart = {
		"labels": [_("Lifetime Value"), _("Won Value"), _("Quoted Pipeline")],
		"values": [
			flt(doc.lifetime_value),
			flt(doc.won_value),
			sum(flt(q.total_revenue) for q in quotes if q.status in {"Shared", "Revision Requested"}),
		],
	}

	days = 14
	end = getdate(today())
	labels = []
	lead_map = defaultdict(int)
	quote_map = defaultdict(int)
	delivery_map = defaultdict(int)

	for i in range(days - 1, -1, -1):
		d = end - timedelta(days=i)
		key = d.isoformat()
		labels.append(d.strftime("%d %b"))
		lead_map[key] = 0
		quote_map[key] = 0
		delivery_map[key] = 0

	for p in projects:
		key = getdate(p.creation).isoformat()
		if key in lead_map:
			# treat project creation as customer activity pulse
			lead_map[key] += 1
	for q in quotes:
		key = getdate(q.creation).isoformat()
		if key in quote_map:
			quote_map[key] += 1
	for drow in deliveries:
		when = drow.delivered_on or drow.creation
		if not when:
			continue
		key = getdate(when).isoformat()
		if key in delivery_map:
			delivery_map[key] += 1

	activity_chart = {
		"labels": labels,
		"datasets": [
			{"name": _("Projects"), "values": [lead_map[k] for k in sorted(lead_map.keys())]},
			{"name": _("Quotes"), "values": [quote_map[k] for k in sorted(quote_map.keys())]},
			{"name": _("Deliveries"), "values": [delivery_map[k] for k in sorted(delivery_map.keys())]},
		],
	}

	return {
		"projects": projects,
		"quotes": quotes,
		"deliveries": deliveries,
		"status_chart": status_chart,
		"value_chart": value_chart,
		"activity_chart": activity_chart,
	}


def build_daily_progress(days: int = 14) -> dict:
	"""Daily progress series for charts and reports."""
	days = max(7, min(int(days or 14), 90))
	end = getdate(today())
	start = end - timedelta(days=days - 1)

	def _daily_counts(doctype: str, date_field: str = "creation", extra_where: str = ""):
		rows = frappe.db.sql(
			f"""
			SELECT DATE({date_field}) AS d, COUNT(*) AS cnt
			FROM `tab{doctype}`
			WHERE DATE({date_field}) BETWEEN %(start)s AND %(end)s
			{extra_where}
			GROUP BY DATE({date_field})
			ORDER BY d
			""",
			{"start": start, "end": end},
			as_dict=True,
		)
		return {str(r.d): int(r.cnt) for r in rows if r.d}

	leads = _daily_counts("IC Lead")
	quotes = _daily_counts("IC Quote")
	accepted = _daily_counts("IC Quote", "accepted_on", "AND accepted_on IS NOT NULL")
	projects = _daily_counts("IC Customer Project")
	completed = {}
	if frappe.db.exists("DocType", "IC Customer Project"):
		completed = _daily_counts(
			"IC Customer Project",
			"modified",
			"AND status='Completed'",
		)
	tasks_done = {}
	if frappe.db.exists("DocType", "IC Project Task"):
		tasks_done = _daily_counts(
			"IC Project Task",
			"completed_on",
			"AND completed_on IS NOT NULL AND status='Completed'",
		)
	deliveries = {}
	if frappe.db.exists("DocType", "IC Delivery Record"):
		deliveries = _daily_counts("IC Delivery Record", "delivered_on")

	series = []
	labels = []
	for i in range(days):
		d = start + timedelta(days=i)
		key = d.isoformat()
		labels.append(d.strftime("%d %b"))
		series.append(
			{
				"date": key,
				"label": d.strftime("%d %b"),
				"new_leads": leads.get(key, 0),
				"new_quotes": quotes.get(key, 0),
				"quotes_accepted": accepted.get(key, 0),
				"projects_started": projects.get(key, 0),
				"projects_completed": completed.get(key, 0),
				"tasks_completed": tasks_done.get(key, 0),
				"deliveries": deliveries.get(key, 0),
			}
		)

	chart = {
		"data": {
			"labels": labels,
			"datasets": [
				{"name": "New Leads", "values": [r["new_leads"] for r in series]},
				{"name": "New Quotes", "values": [r["new_quotes"] for r in series]},
				{"name": "Accepted", "values": [r["quotes_accepted"] for r in series]},
				{"name": "Projects Started", "values": [r["projects_started"] for r in series]},
				{"name": "Completed", "values": [r["projects_completed"] for r in series]},
				{"name": "Tasks Done", "values": [r["tasks_completed"] for r in series]},
				{"name": "Deliveries", "values": [r["deliveries"] for r in series]},
			],
		},
		"type": "line",
		"lineOptions": {"regionFill": 1, "hideDots": 0},
		"axisOptions": {"xIsSeries": 1},
		"height": 320,
		"colors": ["#0A4A6C", "#EB7D2D", "#2E8B57", "#5B7C99", "#C45C26", "#3D5A80", "#8B5E3C"],
	}

	totals = {
		"new_leads": sum(r["new_leads"] for r in series),
		"new_quotes": sum(r["new_quotes"] for r in series),
		"quotes_accepted": sum(r["quotes_accepted"] for r in series),
		"projects_started": sum(r["projects_started"] for r in series),
		"projects_completed": sum(r["projects_completed"] for r in series),
		"tasks_completed": sum(r["tasks_completed"] for r in series),
		"deliveries": sum(r["deliveries"] for r in series),
	}

	# Secondary pie: active project mix for representative snapshot
	by_status = frappe.db.sql(
		"""
		SELECT status, COUNT(*) AS cnt
		FROM `tabIC Customer Project`
		WHERE status NOT IN ('Completed', 'Closed', 'Lost')
		GROUP BY status
		ORDER BY cnt DESC
		""",
		as_dict=True,
	)

	return {
		"days": days,
		"series": series,
		"chart": chart,
		"totals": totals,
		"by_status": by_status,
		"status_chart": {
			"data": {
				"labels": [r.status for r in by_status],
				"datasets": [{"name": "Active Projects", "values": [r.cnt for r in by_status]}],
			},
			"type": "pie",
			"height": 280,
			"colors": ["#0A4A6C", "#EB7D2D", "#2E8B57", "#5B7C99", "#C45C26", "#3D5A80", "#8B5E3C"],
		},
	}
