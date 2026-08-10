# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

import frappe

no_cache = 1


def get_context(context):
	token = frappe.form_dict.get("token") or (frappe.request.path or "").rstrip("/").split("/")[-1]
	context.token = token
	context.no_cache = 1
	try:
		context.docreq = frappe.call("instacertify_crm.api.get_public_documents", token=token)
	except Exception:
		context.docreq = None
	return context
