# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import flt, get_url, now_datetime


def _customer_testing_items(rows):
	"""Customers and public payloads only receive selling price — never purchase price."""
	return [
		{
			"test_name": row.test_name,
			"lab_name": row.lab_name,
			"selling_price": flt(row.selling_price),
		}
		for row in rows or []
	]


@frappe.whitelist(allow_guest=True, methods=["GET"])
def get_public_quote(token: str):
	name = frappe.db.get_value("IC Quote", {"public_token": token}, "name")
	if not name:
		frappe.throw(_("Quote not found"), frappe.DoesNotExistError)
	doc = frappe.get_doc("IC Quote", name)
	if doc.status == "Draft":
		frappe.throw(_("Quote is not shared yet"), frappe.PermissionError)

	return {
		"name": doc.name,
		"quote_number": doc.quote_number or doc.name,
		"status": doc.status,
		"customer_name": doc.customer_name,
		"company": doc.company,
		"email": doc.email,
		"phone": doc.phone,
		"country": doc.country,
		"state": doc.state,
		"service": doc.service,
		"description": doc.description,
		"body_html": doc.body_html,
		"validity_date": doc.validity_date,
		"consulting_price": doc.consulting_price,
		"testing_price": doc.testing_price,
		"other_commercials": doc.other_commercials,
		"other_commercials_note": doc.other_commercials_note,
		"total_revenue": doc.total_revenue,
		"bank_snapshot": doc.bank_snapshot,
		"testing_items": _customer_testing_items(doc.testing_items),
		"customer_remark": doc.customer_remark,
		"revision_message": doc.revision_message,
		"public_url": get_url(f"/q/{doc.public_token}"),
	}


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


@frappe.whitelist(allow_guest=True, methods=["GET"])
def get_public_documents(token: str):
	name = frappe.db.get_value("IC Document Request", {"public_token": token}, "name")
	if not name:
		frappe.throw(_("Document request not found"), frappe.DoesNotExistError)
	doc = frappe.get_doc("IC Document Request", name)
	quote = frappe.get_doc("IC Quote", doc.quote)
	service = frappe.get_doc("IC Service", doc.service)
	return {
		"name": doc.name,
		"status": doc.status,
		"quote_number": quote.quote_number or quote.name,
		"company": quote.company,
		"customer_name": quote.customer_name,
		"service": service.service_name,
		"questionnaire": doc.questionnaire,
		"team_remark": doc.team_remark,
		"documents": [
			{
				"document_name": row.document_name,
				"description": row.description,
				"required": row.required,
			}
			for row in service.documents
			if row.active
		],
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
	}


def _notify_quote_owners(quote, title: str, message: str):
	users = set()
	if quote.owner:
		users.add(quote.owner)
	for row in frappe.get_all("Has Role", filters={"role": ["in", ["IC Admin", "IC Sales Ops"]]}, fields=["parent"]):
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
