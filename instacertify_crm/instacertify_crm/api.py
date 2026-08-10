# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

from __future__ import annotations

import json

import frappe
from frappe import _
from frappe.utils import flt, get_url, now_datetime


def _customer_testing_items(rows):
	"""Customers and public payloads only receive selling price — never purchase price."""
	return [
		{
			"applicable_standard": getattr(row, "applicable_standard", None),
			"test_name": row.test_name,
			"lab_name": row.lab_name,
			"units": flt(getattr(row, "units", 1) or 1),
			"per_unit_charges": flt(getattr(row, "per_unit_charges", 0) or 0),
			"selling_price": flt(row.selling_price),
		}
		for row in rows or []
	]


def _amount_rows(rows, type_field: str):
	return [
		{
			"type": getattr(row, type_field, None),
			"description": getattr(row, "description", None),
			"amount": flt(row.amount),
		}
		for row in rows or []
	]


def _quote_payload(doc):
	about_default = "About Service" if (doc.quote_type or "") == "Service" else "About"
	return {
		"name": doc.name,
		"quote_number": doc.quote_number or doc.name,
		"quote_type": doc.quote_type or "Testing",
		"subject": doc.subject,
		"status": doc.status,
		"customer_name": doc.customer_name,
		"company": doc.company,
		"email": doc.email,
		"phone": doc.phone,
		"country": doc.country,
		"state": doc.state,
		"service": doc.service,
		"description": doc.description,
		"about_header": doc.about_header or about_default,
		"about_html": doc.about_html,
		"standards_header": doc.standards_header or "Applicable Standard",
		"standards_html": doc.standards_html,
		"accreditation_html": doc.accreditation_html,
		"sample_requirements_header": doc.sample_requirements_header
		or ("Samples Required" if (doc.quote_type or "") == "Service" else "Sample Required"),
		"sample_requirements_html": doc.sample_requirements_html,
		"commercials_header": doc.commercials_header or "Commercials",
		"deliverables_header": doc.deliverables_header or "Deliverable",
		"deliverables_html": doc.deliverables_html,
		"timeline_header": doc.timeline_header or "Timeline",
		"timeline_html": doc.timeline_html,
		"payment_terms_header": doc.payment_terms_header or "Payment Terms",
		"payment_terms_html": doc.payment_terms_html,
		"sample_handling_header": doc.sample_handling_header
		or "Sample Handling and Disposal Policy",
		"sample_handling_html": doc.sample_handling_html,
		"banking_header": doc.banking_header or "Our Banking Details",
		"cancellation_header": doc.cancellation_header or "Cancellation and Refund Policy",
		"cancellation_refund_html": doc.cancellation_refund_html,
		"force_majeure_header": doc.force_majeure_header or "Force Majeure",
		"force_majeure_html": doc.force_majeure_html,
		"confidentiality_header": doc.confidentiality_header
		or "Confidentiality and Data Protection",
		"confidentiality_html": doc.confidentiality_html,
		"policies_html": doc.policies_html,
		"body_html": doc.body_html,
		"validity_date": doc.validity_date,
		"consulting_price": doc.consulting_price,
		"government_fees_total": getattr(doc, "government_fees_total", 0),
		"testing_price": doc.testing_price,
		"other_commercials": doc.other_commercials,
		"other_commercials_note": doc.other_commercials_note,
		"total_revenue": doc.total_revenue,
		"bank_snapshot": doc.bank_snapshot,
		"testing_items": _customer_testing_items(doc.testing_items),
		"consulting_items": _amount_rows(doc.get("consulting_items"), "consulting_type"),
		"government_fees": _amount_rows(doc.get("government_fees"), "fee_type"),
		"service_testing_charges": _amount_rows(
			doc.get("service_testing_charges"), "charge_type"
		),
		"customer_remark": doc.customer_remark,
		"revision_message": doc.revision_message,
		"public_url": get_url(f"/q/{doc.public_token}"),
	}


@frappe.whitelist(allow_guest=True, methods=["GET"])
def get_public_quote(token: str):
	name = frappe.db.get_value("IC Quote", {"public_token": token}, "name")
	if not name:
		frappe.throw(_("Quote not found"), frappe.DoesNotExistError)
	doc = frappe.get_doc("IC Quote", name)
	if doc.status == "Draft":
		frappe.throw(_("Quote is not shared yet"), frappe.PermissionError)
	return _quote_payload(doc)


@frappe.whitelist(allow_guest=True, methods=["POST"])
def customer_quote_action(token: str, action: str, message: str | None = None):
	name = frappe.db.get_value("IC Quote", {"public_token": token}, "name")
	if not name:
		frappe.throw(_("Quote not found"), frappe.DoesNotExistError)
	doc = frappe.get_doc("IC Quote", name)
	if doc.status not in {"Shared", "Revision Requested"}:
		frappe.throw(_("Quote cannot be actioned in current status"))

	if action == "accept":
		doc.status = "Accepted"
		doc.accepted_on = now_datetime()
		doc.customer_remark = message or doc.customer_remark
		doc.save(ignore_permissions=True)
		_notify_quote_owners(doc, "Quote accepted", f"{doc.name} was accepted by the customer.")
		return get_public_quote(token)

	if action == "revise":
		if not (message or "").strip():
			frappe.throw(_("Please share a revision remark"))
		doc.status = "Revision Requested"
		doc.revision_message = message
		doc.customer_remark = message
		doc.save(ignore_permissions=True)
		_notify_quote_owners(doc, "Quote revision requested", f"{doc.name}: {message}")
		return get_public_quote(token)

	frappe.throw(_("Unknown action"))


@frappe.whitelist(methods=["POST"])
def share_quote(name: str):
	frappe.has_permission("IC Quote", "write", throw=True)
	doc = frappe.get_doc("IC Quote", name)
	doc.status = "Shared"
	doc.shared_on = now_datetime()
	doc.revision_message = None
	doc.save()
	return {"public_url": get_url(f"/q/{doc.public_token}"), "status": doc.status}


@frappe.whitelist(methods=["GET"])
def testing_library():
	"""Sales/Ops see selling price + lab; Admin also sees purchase price."""
	frappe.has_permission("IC Testing Service", "read", throw=True)
	rows = frappe.get_all(
		"IC Testing Service",
		filters={"active": 1},
		fields=["name", "test_name", "lab_name", "selling_price", "purchase_price", "description"],
		order_by="test_name asc",
	)
	is_admin = "IC Admin" in frappe.get_roles() or "System Manager" in frappe.get_roles()
	if is_admin:
		return rows
	for row in rows:
		row.pop("purchase_price", None)
	return rows


@frappe.whitelist(methods=["GET"])
def get_service_documents(service: str):
	frappe.has_permission("IC Service", "read", throw=True)
	if not frappe.db.exists("IC Service", service):
		frappe.throw(_("Service not found"))
	doc = frappe.get_doc("IC Service", service)
	return [
		{
			"document_name": row.document_name,
			"description": row.description,
			"required": row.required,
		}
		for row in doc.documents
		if row.active
	]


@frappe.whitelist(methods=["POST"])
def create_document_request(quote: str, documents=None, questionnaire: str | None = None):
	"""Create a document request with a selected checklist and return the customer link."""
	frappe.has_permission("IC Document Request", "create", throw=True)
	quote_doc = frappe.get_doc("IC Quote", quote)
	if quote_doc.status != "Accepted":
		frappe.throw(_("Quote must be Accepted before sharing documents"))

	if isinstance(documents, str):
		documents = json.loads(documents)
	documents = documents or []
	if not documents:
		frappe.throw(_("Select at least one document"))

	req = frappe.new_doc("IC Document Request")
	req.quote = quote_doc.name
	req.service = quote_doc.service
	req.status = "Shared"
	req.questionnaire = questionnaire
	for row in documents:
		req.append(
			"requested_documents",
			{
				"document_name": row.get("document_name"),
				"description": row.get("description"),
				"required": 1 if row.get("required", 1) else 0,
			},
		)
	req.insert()
	return {"name": req.name, "public_url": req.public_url}


@frappe.whitelist(methods=["POST"])
def sync_branding():
	"""IC Admin: sync IC Settings logos to Letter Head + Website Settings."""
	roles = set(frappe.get_roles())
	if not roles.intersection({"IC Admin", "System Manager"}):
		frappe.throw(_("Only IC Admin can sync branding"), frappe.PermissionError)
	from instacertify_crm.instacertify_crm.doctype.ic_settings.ic_settings import (
		get_branding,
		sync_letter_head,
		sync_website_branding,
	)

	settings = frappe.get_single("IC Settings")
	sync_letter_head(settings)
	sync_website_branding(settings)
	frappe.clear_cache()
	return get_branding(use_cache=False)


@frappe.whitelist(methods=["GET"])
def get_branding():
	from instacertify_crm.instacertify_crm.doctype.ic_settings.ic_settings import get_branding as _get

	return _get()


@frappe.whitelist(methods=["GET"])
def get_team_workload(group_by: str = "Assigned To", active_only: int = 1):
	"""Admin view: how many leads each team member is working on."""
	roles = set(frappe.get_roles())
	if not roles.intersection({"IC Admin", "System Manager"}):
		frappe.throw(_("Only IC Admin can view team workload"), frappe.PermissionError)

	from instacertify_crm.instacertify_crm.report.ic_team_lead_workload.ic_team_lead_workload import (
		execute,
	)

	_columns, rows, _message, chart, summary = execute(
		{"group_by": group_by or "Assigned To", "active_only": active_only}
	)
	return {"rows": rows, "chart": chart, "summary": summary, "group_by": group_by}


@frappe.whitelist(methods=["GET"])
def get_customer_lifecycle(
	lead: str | None = None,
	project: str | None = None,
	email: str | None = None,
):
	"""Full customer lifecycle: quotes, deliveries, reports, customer data, remarks."""
	from instacertify_crm.lifecycle import build_lifecycle

	return build_lifecycle(lead=lead, project=project, email=email)


@frappe.whitelist(methods=["GET"])
def get_project_control_tower(project: str):
	"""Single project Control Tower payload for desk UI."""
	from instacertify_crm.control_tower import build_control_tower

	return build_control_tower(project)


@frappe.whitelist(methods=["GET"])
def get_today_dashboard():
	"""Morning homepage metrics."""
	from instacertify_crm.control_tower import build_today_dashboard

	return build_today_dashboard()


@frappe.whitelist(methods=["GET"])
def get_daily_progress(days: int | str = 14):
	"""Chart-ready daily progress series."""
	from instacertify_crm.customers import build_daily_progress

	return build_daily_progress(days=int(days or 14))


@frappe.whitelist(methods=["POST"])
def mark_service_delivered(
	quote: str,
	remarks: str | None = None,
	attachment: str | None = None,
	remind_6_months: int | bool = 0,
	remind_1_year: int | bool = 1,
	custom_renewal_on: str | None = None,
):
	"""Mark accepted quote service as delivered and optionally schedule renewal reminders."""
	frappe.has_permission("IC Delivery Record", "create", throw=True)
	quote_doc = frappe.get_doc("IC Quote", quote)
	if quote_doc.status not in {"Accepted", "Delivered"}:
		frappe.throw(_("Only accepted quotes can be marked delivered"))

	from instacertify_crm.instacertify_crm.doctype.ic_customer_project.ic_customer_project import (
		ensure_project_for_quote,
	)
	from instacertify_crm.lifecycle import log_delivery

	project = ensure_project_for_quote(quote_doc.name)
	record = log_delivery(
		title=f"Service delivered — {quote_doc.subject or quote_doc.service or quote_doc.name}",
		delivery_type="Quote Service Delivered",
		direction="To Customer",
		quote=quote_doc.name,
		lead=quote_doc.lead,
		project=project.name,
		service=quote_doc.service,
		details=f"Delivered scope: {quote_doc.description or ''}",
		attachment=attachment,
		remarks=remarks,
		status="Shared",
		remind_6_months=remind_6_months,
		remind_1_year=remind_1_year,
		custom_renewal_on=custom_renewal_on,
		dedupe_key={
			"quote": quote_doc.name,
			"delivery_type": "Quote Service Delivered",
		},
	)
	if project.status not in {"Closed", "Lost", "Completed"}:
		project.db_set("status", "Completed", update_modified=True)
		project.db_set("last_activity_on", now_datetime(), update_modified=False)
		project.db_set("waiting_for", None, update_modified=False)
	if quote_doc.status != "Delivered":
		quote_doc.db_set("status", "Delivered", update_modified=True)

	renewals = frappe.get_all(
		"IC Renewal Reminder",
		filters={"delivery_record": record.name, "status": ["in", ["Scheduled", "Notified"]]},
		pluck="name",
	)
	return {"delivery": record.name, "project": project.name, "renewals": renewals}


@frappe.whitelist(methods=["GET"])
def get_lead_cost_spend(
	group_by: str = "Lead Source",
	from_date: str | None = None,
	to_date: str | None = None,
):
	"""Admin view: total lead acquisition cost spend."""
	roles = set(frappe.get_roles())
	if not roles.intersection({"IC Admin", "System Manager"}):
		frappe.throw(_("Only IC Admin can view lead cost spend"), frappe.PermissionError)

	from instacertify_crm.instacertify_crm.report.ic_lead_cost_spend.ic_lead_cost_spend import (
		execute,
	)

	_columns, rows, _message, chart, summary = execute(
		{"group_by": group_by or "Lead Source", "from_date": from_date, "to_date": to_date}
	)
	return {"rows": rows, "chart": chart, "summary": summary, "group_by": group_by}


@frappe.whitelist(methods=["POST"])
def ensure_customer_project(lead: str | None = None, quote: str | None = None):
	"""Create or return the open customer project for a lead/quote."""
	frappe.has_permission("IC Customer Project", "create", throw=True)
	from instacertify_crm.instacertify_crm.doctype.ic_customer_project.ic_customer_project import (
		ensure_project_for_lead,
		ensure_project_for_quote,
	)

	if quote:
		project = ensure_project_for_quote(quote)
	elif lead:
		project = ensure_project_for_lead(lead)
	else:
		frappe.throw(_("Lead or quote is required"))
	return {"name": project.name, "status": project.status}


@frappe.whitelist(methods=["GET"])
def get_customer_history(lead: str | None = None, email: str | None = None, company: str | None = None):
	"""Past quotes, testing/services delivered, document packs and reports for a customer."""
	frappe.has_permission("IC Quote", "read", throw=True)

	filters = {}
	if lead:
		filters["lead"] = lead
	elif email:
		filters["email"] = email
	elif company:
		filters["company"] = company
	else:
		frappe.throw(_("Lead, email or company is required"))

	quotes = frappe.get_all(
		"IC Quote",
		filters=filters,
		fields=[
			"name",
			"quote_number",
			"quote_type",
			"subject",
			"service",
			"status",
			"total_revenue",
			"accepted_on",
			"shared_on",
			"modified",
			"description",
		],
		order_by="modified desc",
		limit_page_length=50,
	)

	history = []
	for q in quotes:
		doc = frappe.get_doc("IC Quote", q.name)
		reports = frappe.get_all(
			"IC Report",
			filters={"quote": q.name},
			fields=["name", "title", "status", "shared_on", "public_url", "report_file"],
			order_by="modified desc",
		)
		docreqs = frappe.get_all(
			"IC Document Request",
			filters={"quote": q.name},
			fields=["name", "status", "public_url", "modified"],
			order_by="modified desc",
		)
		history.append(
			{
				**q,
				"testing_items": _customer_testing_items(doc.testing_items),
				"reports": reports,
				"document_requests": docreqs,
			}
		)

	return {
		"lead": lead,
		"email": email,
		"company": company,
		"quotes": history,
		"totals": {
			"quotes": len(history),
			"accepted": len([h for h in history if h.get("status") == "Accepted"]),
			"reports": sum(len(h.get("reports") or []) for h in history),
		},
	}


@frappe.whitelist(allow_guest=True, methods=["GET"])
def get_public_documents(token: str):
	name = frappe.db.get_value("IC Document Request", {"public_token": token}, "name")
	if not name:
		frappe.throw(_("Document request not found"), frappe.DoesNotExistError)
	doc = frappe.get_doc("IC Document Request", name)
	quote = frappe.get_doc("IC Quote", doc.quote)
	service_name = frappe.db.get_value("IC Service", doc.service, "service_name") or doc.service

	documents = [
		{
			"document_name": row.document_name,
			"description": row.description,
			"required": row.required,
		}
		for row in (doc.requested_documents or [])
	]
	# Backward compatibility for older requests without selected rows
	if not documents:
		service = frappe.get_doc("IC Service", doc.service)
		documents = [
			{
				"document_name": row.document_name,
				"description": row.description,
				"required": row.required,
			}
			for row in service.documents
			if row.active
		]

	return {
		"name": doc.name,
		"status": doc.status,
		"quote_number": quote.quote_number or quote.name,
		"company": quote.company,
		"customer_name": quote.customer_name,
		"service": service_name,
		"questionnaire": doc.questionnaire,
		"team_remark": doc.team_remark,
		"documents": documents,
		"uploads": [
			{
				"document_name": row.document_name,
				"file": row.file,
				"remark": row.remark,
				"uploaded_on": row.uploaded_on,
			}
			for row in doc.uploads
		],
	}


@frappe.whitelist(allow_guest=True, methods=["POST"])
def upload_customer_document(token: str, document_name: str, remark: str | None = None):
	name = frappe.db.get_value("IC Document Request", {"public_token": token}, "name")
	if not name:
		frappe.throw(_("Document request not found"), frappe.DoesNotExistError)
	doc = frappe.get_doc("IC Document Request", name)

	files = frappe.request.files
	if not files or "file" not in files:
		frappe.throw(_("File required"))

	allowed = {row.document_name for row in (doc.requested_documents or [])}
	if allowed and document_name not in allowed:
		frappe.throw(_("Document is not part of the requested checklist"))

	file_doc = frappe.new_doc("File")
	file_doc.file_name = files["file"].filename
	file_doc.attached_to_doctype = "IC Document Request"
	file_doc.attached_to_name = doc.name
	file_doc.content = files["file"].stream.read()
	file_doc.is_private = 1
	file_doc.save(ignore_permissions=True)

	doc.append(
		"uploads",
		{
			"document_name": document_name,
			"file": file_doc.file_url,
			"remark": remark,
			"uploaded_on": now_datetime(),
		},
	)
	doc.status = "Uploaded"
	doc.save(ignore_permissions=True)
	_notify_quote_owners(
		frappe.get_doc("IC Quote", doc.quote),
		"Customer uploaded a document",
		f"{doc.quote}: {document_name}",
	)
	return get_public_documents(token)


@frappe.whitelist(allow_guest=True, methods=["POST"])
def finalize_customer_documents(token: str, note: str | None = None):
	name = frappe.db.get_value("IC Document Request", {"public_token": token}, "name")
	if not name:
		frappe.throw(_("Document request not found"), frappe.DoesNotExistError)
	doc = frappe.get_doc("IC Document Request", name)
	doc.status = "Final"
	doc.customer_final_note = note
	doc.save(ignore_permissions=True)
	_notify_quote_owners(
		frappe.get_doc("IC Quote", doc.quote),
		"Customer finalized documents",
		f"{doc.quote} document list marked final.",
	)
	return get_public_documents(token)


@frappe.whitelist(allow_guest=True, methods=["GET"])
def get_public_report(token: str):
	name = frappe.db.get_value("IC Report", {"public_token": token, "status": "Ready"}, "name")
	if not name:
		frappe.throw(_("Report not found or no longer available"), frappe.DoesNotExistError)
	doc = frappe.get_doc("IC Report", name)
	quote = frappe.get_doc("IC Quote", doc.quote)
	return {
		"title": doc.title,
		"message": doc.message,
		"report_file": doc.report_file,
		"shared_on": doc.shared_on,
		"quote_number": quote.quote_number or quote.name,
		"company": quote.company,
		"customer_name": quote.customer_name,
		"service": quote.service,
		"quote_type": quote.quote_type,
		"subject": quote.subject,
	}


def _notify_quote_owners(quote, title: str, message: str):
	users = set()
	if quote.owner:
		users.add(quote.owner)
	for row in frappe.get_all(
		"Has Role", filters={"role": ["in", ["IC Admin", "IC Sales Ops"]]}, fields=["parent"]
	):
		users.add(row.parent)
	for user in users:
		if user in {"Administrator", "Guest"}:
			continue
		notification = frappe.new_doc("Notification Log")
		notification.for_user = user
		notification.type = "Alert"
		notification.document_type = "IC Quote"
		notification.document_name = quote.name
		notification.subject = title
		notification.email_content = message
		notification.insert(ignore_permissions=True)
