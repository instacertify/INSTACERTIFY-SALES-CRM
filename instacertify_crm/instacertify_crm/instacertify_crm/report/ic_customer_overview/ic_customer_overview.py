# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import flt


def execute(filters=None):
	filters = frappe._dict(filters or {})
	frappe.has_permission("IC Customer", "read", throw=True)

	conds = ["1=1"]
	values = {}
	if filters.status:
		conds.append("status = %(status)s")
		values["status"] = filters.status
	where = " AND ".join(conds)

	rows = frappe.db.sql(
		f"""
		SELECT
			name, company, customer_name, email, phone, status,
			active_projects, total_projects, total_quotes,
			lifetime_value, won_value, last_activity_on, country
		FROM `tabIC Customer`
		WHERE {where}
		ORDER BY lifetime_value DESC, active_projects DESC, company ASC
		""",
		values,
		as_dict=True,
	)

	columns = [
		{
			"label": _("Customer"),
			"fieldname": "name",
			"fieldtype": "Link",
			"options": "IC Customer",
			"width": 140,
		},
		{"label": _("Company"), "fieldname": "company", "fieldtype": "Data", "width": 180},
		{"label": _("Contact"), "fieldname": "customer_name", "fieldtype": "Data", "width": 140},
		{"label": _("Email"), "fieldname": "email", "fieldtype": "Data", "width": 180},
		{"label": _("Status"), "fieldname": "status", "fieldtype": "Data", "width": 90},
		{"label": _("Active Projects"), "fieldname": "active_projects", "fieldtype": "Int", "width": 120},
		{"label": _("Total Projects"), "fieldname": "total_projects", "fieldtype": "Int", "width": 110},
		{"label": _("Quotes"), "fieldname": "total_quotes", "fieldtype": "Int", "width": 80},
		{"label": _("Lifetime Value"), "fieldname": "lifetime_value", "fieldtype": "Currency", "width": 130},
		{"label": _("Won Value"), "fieldname": "won_value", "fieldtype": "Currency", "width": 120},
		{"label": _("Last Activity"), "fieldname": "last_activity_on", "fieldtype": "Datetime", "width": 150},
		{"label": _("Country"), "fieldname": "country", "fieldtype": "Data", "width": 100},
	]

	top = rows[:12]
	chart = {
		"data": {
			"labels": [(r.company or r.name)[:22] for r in top],
			"datasets": [
				{
					"name": _("Lifetime Value"),
					"values": [flt(r.lifetime_value) for r in top],
				},
				{
					"name": _("Active Projects"),
					"values": [r.active_projects or 0 for r in top],
				},
			],
		},
		"type": "bar",
		"height": 320,
		"colors": ["#0A4A6C", "#EB7D2D"],
	}

	summary = [
		{"label": _("Customers"), "value": len(rows), "indicator": "blue"},
		{
			"label": _("Active Projects"),
			"value": sum(r.active_projects or 0 for r in rows),
			"indicator": "orange",
		},
		{
			"label": _("Lifetime Value"),
			"value": flt(sum(flt(r.lifetime_value) for r in rows)),
			"datatype": "Currency",
			"indicator": "green",
		},
	]
	return columns, rows, None, chart, summary
