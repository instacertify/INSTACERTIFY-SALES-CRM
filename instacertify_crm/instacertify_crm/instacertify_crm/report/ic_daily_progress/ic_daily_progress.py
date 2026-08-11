# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import cint

from instacertify_crm.customers import build_daily_progress


def execute(filters=None):
	filters = frappe._dict(filters or {})
	frappe.has_permission("IC Lead", "read", throw=True)

	days = cint(filters.get("days") or 14)
	payload = build_daily_progress(days=days)
	series = payload.get("series") or []

	columns = [
		{"label": _("Date"), "fieldname": "date", "fieldtype": "Date", "width": 110},
		{"label": _("Day"), "fieldname": "label", "fieldtype": "Data", "width": 90},
		{"label": _("New Leads"), "fieldname": "new_leads", "fieldtype": "Int", "width": 100},
		{"label": _("New Quotes"), "fieldname": "new_quotes", "fieldtype": "Int", "width": 100},
		{"label": _("Accepted"), "fieldname": "quotes_accepted", "fieldtype": "Int", "width": 100},
		{"label": _("Projects Started"), "fieldname": "projects_started", "fieldtype": "Int", "width": 130},
		{"label": _("Projects Completed"), "fieldname": "projects_completed", "fieldtype": "Int", "width": 140},
		{"label": _("Tasks Completed"), "fieldname": "tasks_completed", "fieldtype": "Int", "width": 130},
		{"label": _("Deliveries"), "fieldname": "deliveries", "fieldtype": "Int", "width": 100},
	]

	totals = payload.get("totals") or {}
	summary = [
		{"label": _("Leads"), "value": totals.get("new_leads", 0), "indicator": "blue"},
		{"label": _("Quotes"), "value": totals.get("new_quotes", 0), "indicator": "orange"},
		{"label": _("Accepted"), "value": totals.get("quotes_accepted", 0), "indicator": "green"},
		{"label": _("Projects Done"), "value": totals.get("projects_completed", 0), "indicator": "green"},
		{"label": _("Tasks Done"), "value": totals.get("tasks_completed", 0), "indicator": "blue"},
		{"label": _("Deliveries"), "value": totals.get("deliveries", 0), "indicator": "orange"},
	]

	chart = payload.get("chart")
	return columns, series, None, chart, summary
