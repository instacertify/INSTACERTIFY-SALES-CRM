# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

"""Project / lead assignment helpers — any IC user can assign; admins always can."""

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import now_datetime

from instacertify_crm.permissions import is_ic_admin, is_ic_user


def _assert_can_assign():
	if not is_ic_user():
		frappe.throw(_("Only Instacertify CRM users can assign work"), frappe.PermissionError)


def _notify_assignment(*, doctype: str, name: str, subject: str, message: str, assignee: str | None):
	targets = set()
	if assignee:
		targets.add(assignee)
	# Always keep admins in the loop
	from frappe.utils.user import get_users_with_role

	for role in ("IC Admin", "System Manager"):
		targets.update(get_users_with_role(role))
	targets.discard("Guest")
	targets.discard(frappe.session.user)

	for user in targets:
		if not user or user == "Administrator":
			# Still notify Administrator if they are the assignee
			if user != assignee:
				continue
		try:
			if not frappe.db.get_value("User", user, "enabled"):
				continue
			note = frappe.new_doc("Notification Log")
			note.for_user = user
			note.type = "Assignment"
			note.document_type = doctype
			note.document_name = name
			note.subject = subject
			note.email_content = message
			note.insert(ignore_permissions=True)
		except Exception:
			frappe.log_error(title=f"IC assignment notify failed for {user}")


@frappe.whitelist(methods=["POST"])
def assign_project(project: str, user: str | None = None):
	"""Assign (or unassign) an IC Customer Project. Any IC user may assign; admin always can."""
	_assert_can_assign()
	if not frappe.has_permission("IC Customer Project", "write") and not is_ic_admin():
		# Fallback: admin can always assign even if something blocks the user
		if not is_ic_admin():
			frappe.throw(
				_("You cannot assign this project. Ask an IC Admin to assign it."),
				frappe.PermissionError,
			)

	doc = frappe.get_doc("IC Customer Project", project)
	# Admins bypass; sales ops need write — already checked above for non-admin
	if not is_ic_admin():
		doc.check_permission("write")

	old = doc.assigned_to
	new = user or None
	if new:
		if not frappe.db.exists("User", new) or not frappe.db.get_value("User", new, "enabled"):
			frappe.throw(_("Select an enabled user"))
	doc.assigned_to = new
	doc.last_activity_on = now_datetime()
	doc.append(
		"remarks",
		{
			"remark_time": now_datetime(),
			"user": frappe.session.user,
			"stage": "Other",
			"remark": (
				f"Assigned to {frappe.db.get_value('User', new, 'full_name') or new}"
				if new
				else "Unassigned"
			),
		},
	)
	doc.save(ignore_permissions=is_ic_admin())

	# Keep linked lead in sync when possible
	if doc.lead and frappe.has_permission("IC Lead", "write"):
		try:
			frappe.db.set_value("IC Lead", doc.lead, "assigned_to", new, update_modified=True)
		except Exception:
			pass

	if old != new:
		label = frappe.db.get_value("User", new, "full_name") if new else _("Unassigned")
		_notify_assignment(
			doctype="IC Customer Project",
			name=doc.name,
			subject=_("Project assigned — {0}").format(doc.customer_name or doc.name),
			message=_("{0} assigned to {1} by {2}").format(
				doc.project_title or doc.name,
				label or new or _("Unassigned"),
				frappe.session.user,
			),
			assignee=new,
		)

	return {"name": doc.name, "assigned_to": doc.assigned_to}


@frappe.whitelist(methods=["POST"])
def assign_lead(lead: str, user: str | None = None):
	"""Assign an IC Lead. Any IC user may assign; admin always can."""
	_assert_can_assign()
	doc = frappe.get_doc("IC Lead", lead)
	if not is_ic_admin():
		doc.check_permission("write")
	else:
		# admin fallback
		pass

	old = doc.assigned_to
	new = user or None
	if new and (not frappe.db.exists("User", new) or not frappe.db.get_value("User", new, "enabled")):
		frappe.throw(_("Select an enabled user"))
	doc.assigned_to = new
	doc.save(ignore_permissions=is_ic_admin())

	# Sync open project assignment
	project = frappe.db.get_value(
		"IC Customer Project",
		{"lead": doc.name, "status": ["not in", ["Closed", "Lost"]]},
		"name",
	)
	if project:
		try:
			frappe.db.set_value("IC Customer Project", project, "assigned_to", new, update_modified=True)
		except Exception:
			pass

	if old != new:
		label = frappe.db.get_value("User", new, "full_name") if new else _("Unassigned")
		_notify_assignment(
			doctype="IC Lead",
			name=doc.name,
			subject=_("Lead assigned — {0}").format(doc.customer_name or doc.name),
			message=_("{0} / {1} assigned to {2} by {3}").format(
				doc.customer_name,
				doc.company,
				label or new or _("Unassigned"),
				frappe.session.user,
			),
			assignee=new,
		)

	return {"name": doc.name, "assigned_to": doc.assigned_to}


def on_project_update(doc, method=None):
	"""When Assigned To changes on the form, notify and keep lead in sync."""
	before = doc.get_doc_before_save()
	if not before or (before.assigned_to or "") == (doc.assigned_to or ""):
		return
	if doc.lead:
		try:
			frappe.db.set_value(
				"IC Lead",
				doc.lead,
				"assigned_to",
				doc.assigned_to,
				update_modified=False,
			)
		except Exception:
			pass
	label = (
		frappe.db.get_value("User", doc.assigned_to, "full_name")
		if doc.assigned_to
		else _("Unassigned")
	)
	_notify_assignment(
		doctype="IC Customer Project",
		name=doc.name,
		subject=_("Project assigned — {0}").format(doc.customer_name or doc.name),
		message=_("{0} assigned to {1}").format(doc.project_title or doc.name, label),
		assignee=doc.assigned_to,
	)
