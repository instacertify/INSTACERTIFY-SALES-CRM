# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

"""Customer lifecycle helpers — deliveries, reports, customer data, remarks."""

from __future__ import annotations

import frappe
from frappe.utils import get_datetime, now_datetime


def log_delivery(
	*,
	title: str,
	delivery_type: str,
	direction: str = "To Customer",
	quote: str | None = None,
	lead: str | None = None,
	project: str | None = None,
	service: str | None = None,
	details: str | None = None,
	attachment: str | None = None,
	remarks: str | None = None,
	linked_report: str | None = None,
	linked_document_request: str | None = None,
	status: str = "Logged",
	delivered_on=None,
	dedupe_key: dict | None = None,
):
	"""Create an IC Delivery Record unless a matching one already exists."""
	if dedupe_key:
		existing = frappe.db.exists("IC Delivery Record", dedupe_key)
		if existing:
			return frappe.get_doc("IC Delivery Record", existing)

	if quote and not project:
		from instacertify_crm.instacertify_crm.doctype.ic_customer_project.ic_customer_project import (
			ensure_project_for_quote,
		)

		project = ensure_project_for_quote(quote).name

	doc = frappe.get_doc(
		{
			"doctype": "IC Delivery Record",
			"title": title,
			"delivery_type": delivery_type,
			"direction": direction,
			"status": status,
			"quote": quote,
			"lead": lead,
			"project": project,
			"service": service,
			"details": details,
			"attachment": attachment,
			"remarks": remarks,
			"linked_report": linked_report,
			"linked_document_request": linked_document_request,
			"delivered_on": delivered_on or now_datetime(),
			"delivered_by": frappe.session.user,
		}
	)
	doc.insert(ignore_permissions=True)
	return doc


def on_quote_update(doc, method=None):
	"""Keep project status in sync when quote is shared/accepted."""
	before = doc.get_doc_before_save()
	old_status = before.status if before else None
	if doc.status == old_status:
		return
	if doc.status not in {"Shared", "Accepted"}:
		return

	from instacertify_crm.instacertify_crm.doctype.ic_customer_project.ic_customer_project import (
		ensure_project_for_quote,
	)

	project = ensure_project_for_quote(doc.name)
	status_map = {
		"Shared": "Quoted",
		"Accepted": "Accepted",
	}
	desired = status_map.get(doc.status)
	if (
		desired
		and project.status not in {"Delivered", "Closed", "Lost"}
		and _status_rank(desired) >= _status_rank(project.status)
	):
		project.status = desired
	project.append(
		"remarks",
		{
			"remark_time": now_datetime(),
			"user": frappe.session.user,
			"stage": "Quote",
			"remark": f"Quote {doc.name} is now {doc.status}",
		},
	)
	project.save(ignore_permissions=True)


def on_report_update(doc, method=None):
	if doc.status != "Ready" or not doc.report_file:
		return
	if frappe.db.exists("IC Delivery Record", {"linked_report": doc.name}):
		return
	quote = frappe.get_doc("IC Quote", doc.quote)
	log_delivery(
		title=doc.title or f"Report shared — {doc.name}",
		delivery_type="Report Shared",
		direction="To Customer",
		quote=doc.quote,
		lead=quote.lead,
		service=quote.service,
		details=doc.message,
		attachment=doc.report_file,
		linked_report=doc.name,
		status="Shared",
		delivered_on=doc.shared_on or now_datetime(),
		remarks=f"Customer link: {doc.public_url}",
		dedupe_key={"linked_report": doc.name},
	)
	_set_project_status(quote.lead, quote.name, "In Delivery")


def on_document_request_update(doc, method=None):
	"""Log customer-uploaded files into delivery records (From Customer)."""
	if not doc.uploads:
		return
	quote = frappe.get_doc("IC Quote", doc.quote)
	for row in doc.uploads:
		if not row.file:
			continue
		title = f"Customer upload — {row.document_name}"
		log_delivery(
			title=title,
			delivery_type="Customer Data Received",
			direction="From Customer",
			quote=doc.quote,
			lead=quote.lead,
			service=doc.service or quote.service,
			details=row.remark,
			attachment=row.file,
			linked_document_request=doc.name,
			status="Logged",
			delivered_on=row.uploaded_on or now_datetime(),
			dedupe_key={
				"linked_document_request": doc.name,
				"attachment": row.file,
				"delivery_type": "Customer Data Received",
			},
		)
	if doc.status in {"Uploaded", "Final", "Needs More"}:
		_set_project_status(quote.lead, quote.name, "Documents Pending" if doc.status != "Final" else "In Delivery")


def _set_project_status(lead: str | None, quote: str | None, status: str):
	project_name = None
	if lead:
		project_name = frappe.db.get_value(
			"IC Customer Project",
			{"lead": lead, "status": ["not in", ["Closed", "Lost", "Delivered"]]},
			"name",
		)
	if not project_name and quote:
		project_name = frappe.db.get_value("IC Customer Project", {"primary_quote": quote}, "name")
	if not project_name:
		return
	project = frappe.get_doc("IC Customer Project", project_name)
	if project.status in {"Closed", "Lost", "Delivered"}:
		return
	if _status_rank(status) >= _status_rank(project.status):
		project.status = status
		project.last_activity_on = now_datetime()
		project.save(ignore_permissions=True)


def _status_rank(status: str) -> int:
	order = [
		"Open",
		"Quoted",
		"Accepted",
		"Documents Pending",
		"In Delivery",
		"Delivered",
		"Closed",
		"Lost",
	]
	try:
		return order.index(status)
	except ValueError:
		return 0


def build_lifecycle(lead: str | None = None, project: str | None = None, email: str | None = None):
	"""Aggregate customer lifecycle timeline for desk UI."""
	frappe.has_permission("IC Delivery Record", "read", throw=True)

	lead_doc = None
	project_doc = None
	if project:
		project_doc = frappe.get_doc("IC Customer Project", project)
		lead = lead or project_doc.lead
		email = email or project_doc.email
	if lead:
		lead_doc = frappe.get_doc("IC Lead", lead)
		email = email or lead_doc.email

	if not lead and not project and not email:
		frappe.throw("Lead, project or email is required")

	quote_filters = {}
	if lead:
		quote_filters["lead"] = lead
	elif email:
		quote_filters["email"] = email

	quotes = (
		frappe.get_all(
			"IC Quote",
			filters=quote_filters,
			fields=[
				"name",
				"quote_number",
				"quote_type",
				"subject",
				"service",
				"status",
				"total_revenue",
				"shared_on",
				"accepted_on",
				"creation",
				"modified",
				"description",
			],
			order_by="creation asc",
		)
		if quote_filters
		else []
	)

	delivery_filters = {}
	if project:
		delivery_filters["project"] = project
	elif lead:
		delivery_filters["lead"] = lead
	elif email:
		delivery_filters["email"] = email

	deliveries = frappe.get_all(
		"IC Delivery Record",
		filters=delivery_filters,
		fields=[
			"name",
			"title",
			"delivery_type",
			"direction",
			"status",
			"delivered_on",
			"service",
			"quote",
			"attachment",
			"linked_report",
			"linked_document_request",
			"remarks",
			"details",
		],
		order_by="delivered_on desc",
		limit_page_length=200,
	)

	reports = []
	docreqs = []
	for q in quotes:
		reports.extend(
			frappe.get_all(
				"IC Report",
				filters={"quote": q.name},
				fields=["name", "title", "status", "shared_on", "public_url", "report_file", "quote"],
			)
		)
		docreqs.extend(
			frappe.get_all(
				"IC Document Request",
				filters={"quote": q.name},
				fields=["name", "status", "public_url", "modified", "quote"],
			)
		)

	projects = []
	if lead:
		projects = frappe.get_all(
			"IC Customer Project",
			filters={"lead": lead},
			fields=["name", "project_title", "status", "service", "last_activity_on", "primary_quote"],
			order_by="modified desc",
		)
	elif project_doc:
		projects = [
			{
				"name": project_doc.name,
				"project_title": project_doc.project_title,
				"status": project_doc.status,
				"service": project_doc.service,
				"last_activity_on": project_doc.last_activity_on,
				"primary_quote": project_doc.primary_quote,
			}
		]

	remarks = []
	for p in projects:
		full = frappe.get_doc("IC Customer Project", p["name"])
		for row in full.remarks or []:
			remarks.append(
				{
					"project": p["name"],
					"remark_time": row.remark_time,
					"user": row.user,
					"stage": row.stage,
					"remark": row.remark,
				}
			)
	remarks.sort(key=lambda r: get_datetime(r["remark_time"] or now_datetime()), reverse=True)

	timeline = []
	if lead_doc:
		timeline.append(
			{
				"when": lead_doc.creation,
				"kind": "Lead",
				"title": f"Lead created — {lead_doc.customer_name}",
				"detail": f"{lead_doc.company} · {lead_doc.status}",
				"link": f"/app/ic-lead/{lead_doc.name}",
			}
		)
	for q in quotes:
		timeline.append(
			{
				"when": q.shared_on or q.creation,
				"kind": "Quote",
				"title": f"{q.quote_number or q.name} ({q.quote_type or 'Testing'}) — {q.status}",
				"detail": f"{q.service or ''} · {q.subject or q.description or ''}",
				"link": f"/app/ic-quote/{q.name}",
			}
		)
		if q.accepted_on:
			timeline.append(
				{
					"when": q.accepted_on,
					"kind": "Accepted",
					"title": f"Quote accepted — {q.quote_number or q.name}",
					"detail": f"Value {q.total_revenue}",
					"link": f"/app/ic-quote/{q.name}",
				}
			)
	for d in deliveries:
		timeline.append(
			{
				"when": d.delivered_on,
				"kind": d.delivery_type,
				"title": d.title,
				"detail": f"{d.direction} · {d.status}" + (f" · {d.service}" if d.service else ""),
				"link": f"/app/ic-delivery-record/{d.name}",
				"attachment": d.attachment,
			}
		)
	for r in reports:
		timeline.append(
			{
				"when": r.shared_on,
				"kind": "Report Shared",
				"title": r.title,
				"detail": r.status,
				"link": f"/app/ic-report/{r.name}",
				"attachment": r.report_file,
			}
		)
	for note in remarks[:40]:
		timeline.append(
			{
				"when": note["remark_time"],
				"kind": f"Remark · {note.get('stage') or 'Other'}",
				"title": note["remark"],
				"detail": note.get("user") or "",
				"link": f"/app/ic-customer-project/{note['project']}",
			}
		)

	timeline = [t for t in timeline if t.get("when")]
	timeline.sort(key=lambda t: get_datetime(t["when"]), reverse=True)

	return {
		"lead": lead_doc.name if lead_doc else lead,
		"project": project_doc.name if project_doc else (projects[0]["name"] if projects else None),
		"customer_name": (project_doc.customer_name if project_doc else None)
		or (lead_doc.customer_name if lead_doc else None),
		"company": (project_doc.company if project_doc else None) or (lead_doc.company if lead_doc else None),
		"email": email,
		"projects": projects,
		"quotes": quotes,
		"deliveries": deliveries,
		"reports": reports,
		"document_requests": docreqs,
		"remarks": remarks[:50],
		"timeline": timeline[:100],
		"totals": {
			"quotes": len(quotes),
			"accepted_quotes": len([q for q in quotes if q.status in {"Accepted", "Delivered"}]),
			"deliveries_to_customer": len([d for d in deliveries if d.direction == "To Customer"]),
			"data_from_customer": len([d for d in deliveries if d.direction == "From Customer"]),
			"reports": len(reports),
			"remarks": len(remarks),
		},
	}
