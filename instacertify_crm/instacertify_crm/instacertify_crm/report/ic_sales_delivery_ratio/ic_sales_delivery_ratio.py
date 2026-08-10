# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import flt


def execute(filters=None):
	filters = frappe._dict(filters or {})
	_assert_admin()

	conditions = ["p.status NOT IN ('Lost')"]
	values = {}
	if filters.from_date:
		conditions.append("DATE(p.creation) >= %(from_date)s")
		values["from_date"] = filters.from_date
	if filters.to_date:
		conditions.append("DATE(p.creation) <= %(to_date)s")
		values["to_date"] = filters.to_date
	where = " AND ".join(conditions)

	rows = frappe.db.sql(
		f"""
		SELECT
			COALESCE(NULLIF(p.commercial_owner, ''), 'Unassigned') AS commercial_owner,
			COUNT(*) AS projects_sold,
			SUM(IFNULL(p.project_value, 0)) AS sales_value,
			SUM(CASE WHEN p.delivery_owner = p.commercial_owner
				AND IFNULL(p.commercial_owner, '') != '' THEN 1 ELSE 0 END) AS delivered_by_self,
			SUM(CASE WHEN IFNULL(p.delivery_owner, '') != ''
				AND p.delivery_owner != IFNULL(p.commercial_owner, '') THEN 1 ELSE 0 END) AS delivered_by_others,
			SUM(CASE WHEN p.status = 'Completed' THEN 1 ELSE 0 END) AS completed_projects
		FROM `tabIC Customer Project` p
		WHERE {where}
		GROUP BY COALESCE(NULLIF(p.commercial_owner, ''), 'Unassigned')
		ORDER BY sales_value DESC
		""",
		values,
		as_dict=True,
	)

	columns = [
		{
			"label": _("Commercial Owner"),
			"fieldname": "commercial_owner",
			"fieldtype": "Data",
			"width": 200,
		},
		{"label": _("Projects Sold"), "fieldname": "projects_sold", "fieldtype": "Int", "width": 120},
		{"label": _("Sales Value"), "fieldname": "sales_value", "fieldtype": "Currency", "width": 140},
		{
			"label": _("Delivered by Self"),
			"fieldname": "delivered_by_self",
			"fieldtype": "Int",
			"width": 140,
		},
		{
			"label": _("Delivered by Others"),
			"fieldname": "delivered_by_others",
			"fieldtype": "Int",
			"width": 150,
		},
		{
			"label": _("Completed"),
			"fieldname": "completed_projects",
			"fieldtype": "Int",
			"width": 110,
		},
	]

	for row in rows:
		if row.commercial_owner and row.commercial_owner != "Unassigned":
			row.commercial_owner = (
				frappe.db.get_value("User", row.commercial_owner, "full_name") or row.commercial_owner
			)
		row.sales_value = flt(row.sales_value)

	summary = [
		{
			"label": _("People"),
			"value": len(rows),
			"indicator": "blue",
		},
		{
			"label": _("Total Sales Value"),
			"value": flt(sum(r.sales_value for r in rows)),
			"datatype": "Currency",
			"indicator": "green",
		},
	]
	return columns, rows, None, None, summary


def _assert_admin():
	roles = set(frappe.get_roles())
	if not roles.intersection({"IC Admin", "System Manager"}):
		frappe.throw(_("Only IC Admin can view sales-to-delivery ratio"), frappe.PermissionError)
