# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

"""Project Control Tower — one screen for the full delivery record."""

from __future__ import annotations

import frappe
from frappe.utils import flt, formatdate, getdate, today


TERMINAL = {"Completed", "Closed", "Lost"}


def build_control_tower(project: str) -> dict:
	frappe.has_permission("IC Customer Project", "read", throw=True)
	doc = frappe.get_doc("IC Customer Project", project)

	tasks = frappe.get_all(
		"IC Project Task",
		filters={"project": project},
		fields=[
			"name",
			"task_title",
			"status",
			"assigned_to",
			"due_date",
			"waiting_for",
			"waiting_expected_on",
			"waiting_note",
			"sequence",
			"completed_on",
		],
		order_by="sequence asc, creation asc",
	)
	for row in tasks:
		if row.assigned_to:
			row["assigned_to_name"] = (
				frappe.db.get_value("User", row.assigned_to, "full_name") or row.assigned_to
			)

	docs = []
	if doc.primary_quote:
		docs = frappe.get_all(
			"IC Document Request",
			filters={"quote": doc.primary_quote},
			fields=["name", "status", "public_url", "modified"],
			order_by="modified desc",
			limit_page_length=20,
		)

	deliveries = frappe.get_all(
		"IC Delivery Record",
		filters={"project": project},
		fields=["name", "title", "delivery_type", "direction", "delivered_on", "status"],
		order_by="delivered_on desc",
		limit_page_length=30,
	)

	quotes = []
	if doc.lead:
		quotes = frappe.get_all(
			"IC Quote",
			filters={"lead": doc.lead},
			fields=["name", "quote_number", "status", "total_revenue", "accepted_on"],
			order_by="creation desc",
		)

	timeline = []
	for row in doc.remarks or []:
		timeline.append(
			{
				"when": row.remark_time,
				"user": row.user,
				"stage": row.stage,
				"text": row.remark,
			}
		)
	timeline.sort(key=lambda x: x.get("when") or "", reverse=True)

	task_counts = {
		"total": len(tasks),
		"to_do": sum(1 for t in tasks if t.status == "To Do"),
		"in_progress": sum(1 for t in tasks if t.status == "In Progress"),
		"waiting": sum(1 for t in tasks if t.status == "Waiting"),
		"completed": sum(1 for t in tasks if t.status == "Completed"),
		"overdue": sum(
			1
			for t in tasks
			if t.due_date
			and t.status != "Completed"
			and getdate(t.due_date) < getdate(today())
		),
	}

	commercial_name = (
		frappe.db.get_value("User", doc.commercial_owner, "full_name")
		if doc.commercial_owner
		else None
	)
	delivery_name = (
		frappe.db.get_value("User", doc.delivery_owner, "full_name")
		if doc.delivery_owner
		else None
	)

	return {
		"project": {
			"name": doc.name,
			"project_title": doc.project_title,
			"status": doc.status,
			"service": doc.service,
			"customer_name": doc.customer_name,
			"company": doc.company,
			"email": doc.email,
			"phone": doc.phone,
			"commercial_owner": doc.commercial_owner,
			"commercial_owner_name": commercial_name,
			"delivery_owner": doc.delivery_owner,
			"delivery_owner_name": delivery_name,
			"project_value": flt(doc.project_value),
			"start_date": doc.start_date,
			"expected_completion": doc.expected_completion,
			"waiting_for": doc.waiting_for,
			"waiting_expected_on": doc.waiting_expected_on,
			"waiting_note": doc.waiting_note,
			"lead": doc.lead,
			"primary_quote": doc.primary_quote,
			"last_activity_on": doc.last_activity_on,
		},
		"tasks": tasks,
		"task_counts": task_counts,
		"documents": docs,
		"deliveries": deliveries,
		"quotes": quotes,
		"timeline": timeline[:40],
	}


def build_today_dashboard() -> dict:
	"""Morning homepage metrics for Instacertify CRM."""
	frappe.has_permission("IC Lead", "read", throw=True)
	today_str = today()

	new_leads = frappe.db.count("IC Lead", {"creation": [">=", today_str]})
	followups = frappe.db.count(
		"IC Lead",
		{
			"follow_up_on": ["<=", f"{today_str} 23:59:59"],
			"status": ["not in", ["WON", "LOST"]],
		},
	)
	new_quotes = frappe.db.count("IC Quote", {"creation": [">=", today_str]})
	projects_started = frappe.db.count(
		"IC Customer Project", {"start_date": today_str}
	) or frappe.db.count("IC Customer Project", {"creation": [">=", today_str]})

	tasks_due = 0
	tasks_overdue = 0
	if frappe.db.exists("DocType", "IC Project Task"):
		tasks_due = frappe.db.count(
			"IC Project Task",
			{"due_date": today_str, "status": ["!=", "Completed"]},
		)
		tasks_overdue = frappe.db.count(
			"IC Project Task",
			{"due_date": ["<", today_str], "status": ["!=", "Completed"]},
		)

	active_filters = {"status": ["not in", list(TERMINAL)]}
	active_projects = frappe.db.count("IC Customer Project", active_filters)

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

	waiting = frappe.db.sql(
		"""
		SELECT waiting_for, COUNT(*) AS cnt
		FROM `tabIC Customer Project`
		WHERE IFNULL(waiting_for, '') != ''
		  AND status NOT IN ('Completed', 'Closed', 'Lost')
		GROUP BY waiting_for
		ORDER BY cnt DESC
		""",
		as_dict=True,
	)

	completed_month = frappe.db.sql(
		"""
		SELECT COUNT(*) FROM `tabIC Customer Project`
		WHERE status = 'Completed'
		  AND DATE_FORMAT(modified, '%%Y-%%m') = DATE_FORMAT(CURDATE(), '%%Y-%%m')
		"""
	)[0][0]

	return {
		"today": {
			"new_leads": new_leads,
			"followups_due": followups,
			"new_quotations": new_quotes,
			"projects_started": projects_started,
			"tasks_due_today": tasks_due,
			"overdue_tasks": tasks_overdue,
		},
		"project_control": {
			"active_projects": active_projects,
			"by_status": by_status,
			"waiting": waiting,
			"completed_this_month": completed_month,
		},
		"as_of": today_str,
	}
