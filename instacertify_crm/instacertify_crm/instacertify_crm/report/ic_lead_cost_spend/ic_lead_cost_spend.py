# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import flt


def execute(filters=None):
	filters = frappe._dict(filters or {})
	_assert_admin()

	group_by = filters.get("group_by") or "Lead Source"
	columns = _columns(group_by)
	rows = _rows(filters, group_by)
	chart = {
		"data": {
			"labels": [r.get("group_label") or _("Unassigned") for r in rows],
			"datasets": [{"name": _("Lead Cost"), "values": [flt(r.get("total_cost")) for r in rows]}],
		},
		"type": "bar",
	}
	total_cost = sum(flt(r.get("total_cost")) for r in rows)
	total_leads = sum(flt(r.get("lead_count")) for r in rows)
	summary = [
		{"label": _("Total Lead Cost Spend"), "value": total_cost, "datatype": "Currency"},
		{"label": _("Leads"), "value": total_leads, "datatype": "Int"},
		{
			"label": _("Avg Cost / Lead"),
			"value": (total_cost / total_leads) if total_leads else 0,
			"datatype": "Currency",
		},
	]
	return columns, rows, None, chart, summary


def _assert_admin():
	roles = set(frappe.get_roles())
	if not roles.intersection({"IC Admin", "System Manager"}):
		frappe.throw(_("Only IC Admin can view lead cost spend"), frappe.PermissionError)


def _columns(group_by: str):
	label = {
		"Lead Source": _("Lead Source"),
		"Assigned To": _("Assigned To"),
		"Status": _("Status"),
		"Month": _("Month"),
	}.get(group_by, _("Group"))
	return [
		{"label": label, "fieldname": "group_label", "fieldtype": "Data", "width": 220},
		{"label": _("Leads"), "fieldname": "lead_count", "fieldtype": "Int", "width": 100},
		{"label": _("Total Lead Cost"), "fieldname": "total_cost", "fieldtype": "Currency", "width": 140},
		{"label": _("Avg Cost"), "fieldname": "avg_cost", "fieldtype": "Currency", "width": 120},
	]


def _rows(filters, group_by: str):
	conditions = ["docstatus < 2"]
	values: dict = {}

	if filters.get("from_date"):
		conditions.append("DATE(creation) >= %(from_date)s")
		values["from_date"] = filters.from_date
	if filters.get("to_date"):
		conditions.append("DATE(creation) <= %(to_date)s")
		values["to_date"] = filters.to_date
	if filters.get("status"):
		conditions.append("status = %(status)s")
		values["status"] = filters.status
	if filters.get("lead_source"):
		conditions.append("lead_source = %(lead_source)s")
		values["lead_source"] = filters.lead_source

	where = " AND ".join(conditions)
	if group_by == "Assigned To":
		select_group = "IFNULL(assigned_to, 'Unassigned')"
	elif group_by == "Status":
		select_group = "status"
	elif group_by == "Month":
		select_group = "DATE_FORMAT(creation, '%%Y-%%m')"
	else:
		select_group = "IFNULL(lead_source, 'Unknown')"

	data = frappe.db.sql(
		f"""
		SELECT
			{select_group} AS group_label,
			COUNT(*) AS lead_count,
			COALESCE(SUM(IFNULL(lead_cost, 0)), 0) AS total_cost,
			COALESCE(AVG(IFNULL(lead_cost, 0)), 0) AS avg_cost
		FROM `tabIC Lead`
		WHERE {where}
		GROUP BY {select_group}
		ORDER BY total_cost DESC
		""",
		values,
		as_dict=True,
	)
	return data
