# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

from __future__ import annotations

import frappe
from frappe import _

from instacertify_crm.control_tower import build_today_dashboard
from instacertify_crm.customers import build_daily_progress


def execute(filters=None):
	data = build_today_dashboard()
	today = data.get("today") or {}
	control = data.get("project_control") or {}
	progress = build_daily_progress(days=14)

	columns = [
		{"label": _("Metric"), "fieldname": "metric", "fieldtype": "Data", "width": 260},
		{"label": _("Value"), "fieldname": "value", "fieldtype": "Data", "width": 160},
		{"label": _("Section"), "fieldname": "section", "fieldtype": "Data", "width": 160},
	]

	rows = [
		{"metric": _("New Leads"), "value": today.get("new_leads", 0), "section": _("Today")},
		{
			"metric": _("Follow-ups Due"),
			"value": today.get("followups_due", 0),
			"section": _("Today"),
		},
		{
			"metric": _("New Quotations"),
			"value": today.get("new_quotations", 0),
			"section": _("Today"),
		},
		{
			"metric": _("Projects Started"),
			"value": today.get("projects_started", 0),
			"section": _("Today"),
		},
		{
			"metric": _("Tasks Due Today"),
			"value": today.get("tasks_due_today", 0),
			"section": _("Today"),
		},
		{
			"metric": _("Overdue Tasks"),
			"value": today.get("overdue_tasks", 0),
			"section": _("Today"),
		},
		{
			"metric": _("Active Projects"),
			"value": control.get("active_projects", 0),
			"section": _("Project Control"),
		},
		{
			"metric": _("Completed This Month"),
			"value": control.get("completed_this_month", 0),
			"section": _("Project Control"),
		},
	]

	for row in control.get("by_status") or []:
		rows.append({"metric": row.status, "value": row.cnt, "section": _("By Status")})
	for row in control.get("waiting") or []:
		rows.append(
			{
				"metric": _("Waiting — {0}").format(row.waiting_for),
				"value": row.cnt,
				"section": _("Waiting"),
			}
		)

	# Representative today snapshot bars + 14-day trend line datasets merged for desk chart
	chart = {
		"data": {
			"labels": [
				_("Leads"),
				_("Follow-ups"),
				_("Quotes"),
				_("Projects"),
				_("Tasks Due"),
				_("Overdue"),
			],
			"datasets": [
				{
					"name": _("Today"),
					"values": [
						today.get("new_leads", 0),
						today.get("followups_due", 0),
						today.get("new_quotations", 0),
						today.get("projects_started", 0),
						today.get("tasks_due_today", 0),
						today.get("overdue_tasks", 0),
					],
				}
			],
		},
		"type": "bar",
		"height": 300,
		"colors": ["#0A4A6C"],
	}

	# Prefer trend chart when there is history
	trend = progress.get("chart")
	if trend and any(
		sum(ds.get("values") or []) > 0 for ds in (trend.get("data") or {}).get("datasets") or []
	):
		chart = trend

	summary = [
		{"label": _("Active Projects"), "value": control.get("active_projects", 0), "indicator": "blue"},
		{"label": _("Overdue Tasks"), "value": today.get("overdue_tasks", 0), "indicator": "orange"},
		{"label": _("Follow-ups Due"), "value": today.get("followups_due", 0), "indicator": "red"},
		{
			"label": _("14d Completions"),
			"value": (progress.get("totals") or {}).get("projects_completed", 0),
			"indicator": "green",
		},
	]
	return columns, rows, None, chart, summary
