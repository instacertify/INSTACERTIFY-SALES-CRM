# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import cint


ACTIVE_STATUSES = ("NEW", "CONTACTED", "QUALIFIED", "QUOTATION", "NEGOTIATION")
ALL_STATUSES = ("NEW", "CONTACTED", "QUALIFIED", "QUOTATION", "NEGOTIATION", "WON", "LOST")


def execute(filters=None):
	filters = frappe._dict(filters or {})
	_assert_admin()

	group_by = filters.get("group_by") or "Assigned To"
	user_field = "assigned_to" if group_by == "Assigned To" else "owner"

	columns = _columns(group_by)
	rows = _rows(filters, user_field)
	chart = _chart(rows, group_by)
	summary = _summary(rows)
	return columns, rows, None, chart, summary


def _assert_admin():
	roles = set(frappe.get_roles())
	if not roles.intersection({"IC Admin", "System Manager"}):
		frappe.throw(_("Only IC Admin can view team lead workload"), frappe.PermissionError)


def _columns(group_by: str):
	cols = [
		{
			"label": _("Team Member") if group_by == "Assigned To" else _("Owner"),
			"fieldname": "user",
			"fieldtype": "Link",
			"options": "User",
			"width": 220,
		},
		{"label": _("Full Name"), "fieldname": "full_name", "fieldtype": "Data", "width": 180},
	]
	for status in ALL_STATUSES:
		cols.append(
			{
				"label": _(status.replace("_", " ").title()),
				"fieldname": status.lower(),
				"fieldtype": "Int",
				"width": 100,
			}
		)
	cols.extend(
		[
			{"label": _("Active Leads"), "fieldname": "active_leads", "fieldtype": "Int", "width": 110},
			{"label": _("Total Leads"), "fieldname": "total_leads", "fieldtype": "Int", "width": 100},
			{
				"label": _("Open Follow-ups"),
				"fieldname": "open_followups",
				"fieldtype": "Int",
				"width": 120,
			},
		]
	)
	return cols


def _rows(filters, user_field: str):
	conditions = ["docstatus < 2"]
	values: dict = {}

	if cint(filters.get("active_only")):
		conditions.append("status in %(active)s")
		values["active"] = ACTIVE_STATUSES
	if filters.get("status"):
		conditions.append("status = %(status)s")
		values["status"] = filters.status

	where = " AND ".join(conditions)
	# Use COALESCE so unassigned shows as a bucket
	data = frappe.db.sql(
		f"""
		SELECT
			COALESCE(NULLIF({user_field}, ''), 'Unassigned') AS user,
			status,
			COUNT(*) AS cnt,
			SUM(CASE WHEN follow_up_on IS NOT NULL AND status IN ('NEW','CONTACTED','QUALIFIED','QUOTATION','NEGOTIATION') THEN 1 ELSE 0 END) AS followups
		FROM `tabIC Lead`
		WHERE {where}
		GROUP BY COALESCE(NULLIF({user_field}, ''), 'Unassigned'), status
		ORDER BY user, status
		""",
		values,
		as_dict=True,
	)

	bucket: dict[str, dict] = {}
	for row in data:
		user = row.user
		entry = bucket.setdefault(
			user,
			{
				"user": user if user != "Unassigned" else None,
				"full_name": _("Unassigned") if user == "Unassigned" else _fullname_name(user),
				**{s.lower(): 0 for s in ALL_STATUSES},
				"active_leads": 0,
				"total_leads": 0,
				"open_followups": 0,
			},
		)
		key = (row.status or "").lower()
		if key in entry:
			entry[key] += cint(row.cnt)
		entry["total_leads"] += cint(row.cnt)
		if row.status in ACTIVE_STATUSES:
			entry["active_leads"] += cint(row.cnt)
		entry["open_followups"] += cint(row.followups)

	# Sort: most active first, Unassigned last
	rows = list(bucket.values())
	rows.sort(key=lambda r: (r["full_name"] == _("Unassigned"), -r["active_leads"], r["full_name"] or ""))
	# Keep Link field empty for Unassigned so it doesn't break
	for row in rows:
		if row["full_name"] == _("Unassigned"):
			row["user"] = None
	return rows


def _fullname_name(user: str) -> str:
	return frappe.db.get_value("User", user, "full_name") or user


def _chart(rows, group_by: str):
	labels = [r["full_name"] or r["user"] or _("Unassigned") for r in rows]
	return {
		"data": {
			"labels": labels,
			"datasets": [
				{"name": _("Active Leads"), "values": [r["active_leads"] for r in rows]},
				{"name": _("Total Leads"), "values": [r["total_leads"] for r in rows]},
			],
		},
		"type": "bar",
		"barOptions": {"stacked": 0},
		"title": _("Leads by {0}").format(_(group_by)),
	}


def _summary(rows):
	active = sum(r["active_leads"] for r in rows)
	total = sum(r["total_leads"] for r in rows)
	members = len([r for r in rows if r.get("user")])
	unassigned = next((r["active_leads"] for r in rows if not r.get("user")), 0)
	return [
		{"value": members, "label": _("Team Members with Leads"), "datatype": "Int"},
		{"value": active, "label": _("Active Leads"), "datatype": "Int"},
		{"value": unassigned, "label": _("Unassigned Active"), "datatype": "Int"},
		{"value": total, "label": _("Total Leads in View"), "datatype": "Int"},
	]
