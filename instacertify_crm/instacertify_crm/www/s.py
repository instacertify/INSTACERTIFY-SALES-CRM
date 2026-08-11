# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

import frappe
from frappe.utils import get_url
from instacertify_crm.instacertify_crm.doctype.ic_settings.ic_settings import get_branding

no_cache = 1


def get_context(context):
	token = frappe.form_dict.get("token") or (frappe.request.path or "").rstrip("/").split("/")[-1]
	context.token = token
	context.no_cache = 1
	context.branding = get_branding()
	name = frappe.db.get_value("IC Sample Request", {"public_token": token}, "name")
	if not name:
		context.sample = None
		return context
	doc = frappe.get_doc("IC Sample Request", name)
	context.sample = {
		"name": doc.name,
		"sample_label": doc.sample_label,
		"tracking_code": doc.tracking_code,
		"status": doc.status,
		"company": doc.company,
		"customer_name": doc.customer_name,
		"lab": doc.lab,
		"standard_code": doc.standard_code,
		"no_of_samples": doc.no_of_samples,
		"accreditation": doc.accreditation,
		"testing_timeline": doc.testing_timeline,
		"received_on": doc.received_on,
		"dispatched_on": doc.dispatched_on,
		"testing_started_on": doc.testing_started_on,
		"report_ready_on": doc.report_ready_on,
		"shared_on": doc.shared_on,
		"report_available": bool(doc.report_file) and doc.status in {
			"Report Available",
			"Report Uploaded",
			"Shared with Customer",
			"Closed",
		},
		"report_file": doc.report_file if doc.status in {"Shared with Customer", "Closed", "Report Uploaded", "Report Available"} else None,
		"public_url": get_url(f"/s/{doc.public_token}"),
		"notes": doc.notes,
	}
	return context
