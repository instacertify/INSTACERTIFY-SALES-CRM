# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

"""Role helpers for Instacertify CRM permissions."""

from __future__ import annotations

import frappe


def is_ic_admin(user: str | None = None) -> bool:
	user = user or frappe.session.user
	roles = set(frappe.get_roles(user))
	return bool(roles.intersection({"IC Admin", "System Manager"}))


IC_USER_ROLES = {
	"IC Admin",
	"IC All Ops Manager",
	"IC Operations Manager",
	"IC Sales Person",
	"IC Sales Ops",
	"System Manager",
}


def is_ic_user(user: str | None = None) -> bool:
	user = user or frappe.session.user
	roles = set(frappe.get_roles(user))
	return bool(roles.intersection(IC_USER_ROLES))


def can_export(user: str | None = None) -> bool:
	user = user or frappe.session.user
	roles = set(frappe.get_roles(user))
	return bool(roles.intersection({"IC Admin", "IC All Ops Manager", "System Manager"}))


def quote_template_has_permission(doc, ptype: str, user: str | None = None) -> bool | None:
	"""Anyone with role can create/read; only admins can write/delete existing templates."""
	user = user or frappe.session.user
	if ptype in {"write", "delete", "submit", "cancel", "amend"}:
		# Allow first save of a brand-new template for Sales Ops (create path)
		if getattr(doc, "is_new", lambda: False)() and ptype == "write":
			return True
		if not is_ic_admin(user):
			return False
	return None
