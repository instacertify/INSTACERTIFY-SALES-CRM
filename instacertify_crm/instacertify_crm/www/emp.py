# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

import frappe
from instacertify_crm.instacertify_crm.doctype.ic_settings.ic_settings import get_branding

no_cache = 1


def get_context(context):
	token = frappe.form_dict.get("token") or (frappe.request.path or "").rstrip("/").split("/")[-1]
	context.token = token
	context.no_cache = 1
	context.branding = get_branding()
	name = frappe.db.get_value("IC Employee Profile", {"public_token": token}, "name")
	if not name:
		context.profile = None
		return context
	doc = frappe.get_doc("IC Employee Profile", name)
	if doc.status not in {"Active", "Pending Approval"}:
		context.profile = None
		return context
	context.profile = {
		"employee_code": doc.employee_code,
		"employee_name": doc.employee_name,
		"department": doc.department,
		"designation": doc.designation,
		"date_of_joining": doc.date_of_joining,
		"joining_letter": doc.joining_letter,
		"status": doc.status,
	}
	return context
