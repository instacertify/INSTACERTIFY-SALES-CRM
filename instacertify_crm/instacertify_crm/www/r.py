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
	try:
		context.report = frappe.call("instacertify_crm.api.get_public_report", token=token)
	except Exception:
		context.report = None
	return context
