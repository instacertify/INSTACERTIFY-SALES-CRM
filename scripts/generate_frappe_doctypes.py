#!/usr/bin/env python3
"""Generate Instacertify CRM DocType JSON/Python scaffolding for ERPNext 16."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "instacertify_crm/instacertify_crm/instacertify_crm/doctype"


def field(**kwargs):
    kwargs.setdefault("fieldname", kwargs.get("label", "").lower().replace(" ", "_")[:140])
    return kwargs


def perm(role, **kwargs):
    base = {
        "role": role,
        "read": 1,
        "write": 1,
        "create": 1,
        "delete": 0,
        "submit": 0,
        "cancel": 0,
        "amend": 0,
        "report": 1,
        "export": 1 if role == "IC Admin" else 0,
        "import": 1 if role == "IC Admin" else 0,
        "share": 1,
        "print": 1,
        "email": 1,
    }
    # `import` is reserved in Python kwargs callers — accept import_ as alias
    if "import_" in kwargs:
        kwargs["import"] = kwargs.pop("import_")
    base.update(kwargs)
    return base


def write_doctype(name: str, meta: dict, controller: str = ""):
    folder = ROOT / name
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "__init__.py").write_text("", encoding="utf-8")
    meta = {
        "doctype": "DocType",
        "name": meta["name"],
        "module": "Instacertify CRM",
        "engine": "InnoDB",
        "is_submittable": 0,
        "istable": meta.get("istable", 0),
        "editable_grid": meta.get("editable_grid", 1),
        "track_changes": 1,
        "sort_field": "modified",
        "sort_order": "DESC",
        "field_order": [f["fieldname"] for f in meta["fields"] if f.get("fieldname")],
        **{k: v for k, v in meta.items() if k not in {"fields"}},
        "fields": meta["fields"],
        "permissions": meta.get(
            "permissions",
            [
                perm("System Manager", delete=1, export=1, import_=1),
                perm("IC Admin", delete=1, export=1, import_=1),
                perm("IC Sales Ops", export=0, import_=0),
            ],
        ),
    }
    (folder / f"{name}.json").write_text(json.dumps(meta, indent=1) + "\n", encoding="utf-8")
    py = controller or f'''# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class {meta["name"].replace(" ", "")}(Document):
	pass
'''
    (folder / f"{name}.py").write_text(py, encoding="utf-8")
    js_path = folder / f"{name}.js"
    if not js_path.exists():
        js_path.write_text(
            f"""// Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
// For license information, please see license.txt

frappe.ui.form.on('{meta["name"]}', {{
	refresh(frm) {{}}
}});
""",
            encoding="utf-8",
        )


def main():
    ROOT.mkdir(parents=True, exist_ok=True)

    write_doctype(
        "ic_lead_source",
        {
            "name": "IC Lead Source",
            "autoname": "field:source_name",
            "naming_rule": "By fieldname",
            "title_field": "source_name",
            "search_fields": "source_name",
            "fields": [
                field(fieldname="source_name", label="Source Name", fieldtype="Data", reqd=1, unique=1),
                field(fieldname="active", label="Active", fieldtype="Check", default="1"),
            ],
        },
    )

    write_doctype(
        "ic_lead_log",
        {
            "name": "IC Lead Log",
            "istable": 1,
            "editable_grid": 1,
            "fields": [
                field(fieldname="log_time", label="Time", fieldtype="Datetime", default="Now", in_list_view=1),
                field(fieldname="user", label="User", fieldtype="Link", options="User", default="__user", in_list_view=1),
                field(fieldname="message", label="Conversation / Note", fieldtype="Small Text", reqd=1, in_list_view=1),
            ],
            "permissions": [],
        },
    )

    write_doctype(
        "ic_lead",
        {
            "name": "IC Lead",
            "autoname": "naming_series:",
            "naming_rule": "By \"Naming Series\" field",
            "title_field": "customer_name",
            "search_fields": "customer_name,company,email,phone,status",
            "fields": [
                field(fieldname="naming_series", label="Series", fieldtype="Select", options="IC-LEAD-.YYYY.-", default="IC-LEAD-.YYYY.-", reqd=1),
                field(fieldname="customer_name", label="Customer Name", fieldtype="Data", reqd=1, in_list_view=1),
                field(fieldname="company", label="Company", fieldtype="Data", reqd=1, in_list_view=1),
                field(fieldname="company_size", label="Company Size", fieldtype="Select", options="\nMICRO\nSMALL\nMEDIUM\nLARGE", reqd=1, in_list_view=1),
                field(fieldname="column_break_1", fieldtype="Column Break"),
                field(fieldname="email", label="Email", fieldtype="Data", options="Email", reqd=1),
                field(fieldname="phone", label="Phone Number", fieldtype="Data", reqd=1),
                field(fieldname="lead_source", label="Lead Source", fieldtype="Link", options="IC Lead Source", reqd=1, in_list_view=1),
                field(fieldname="section_location", label="Location", fieldtype="Section Break"),
                field(fieldname="country", label="Country", fieldtype="Link", options="Country", reqd=1, default="India"),
                field(fieldname="column_break_2", fieldtype="Column Break"),
                field(fieldname="state", label="State", fieldtype="Data", description="Required when Country is India. Use Indian state name."),
                field(fieldname="section_ops", label="Operations", fieldtype="Section Break"),
                field(fieldname="status", label="Status", fieldtype="Select", options="NEW\nCONTACTED\nFOLLOW_UP\nQUOTE_SENT\nWON\nLOST", default="NEW", reqd=1, in_list_view=1),
                field(fieldname="follow_up_on", label="Follow Up Reminder", fieldtype="Datetime"),
                field(fieldname="column_break_3", fieldtype="Column Break"),
                field(fieldname="last_contact_on", label="Last Contact", fieldtype="Datetime"),
                field(fieldname="assigned_to", label="Assigned To", fieldtype="Link", options="User"),
                field(fieldname="section_notes", label="Notes & Logs", fieldtype="Section Break"),
                field(fieldname="notes", label="Notes", fieldtype="Small Text"),
                field(fieldname="logs", label="Conversation Logs", fieldtype="Table", options="IC Lead Log"),
            ],
        },
        controller='''# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class ICLead(Document):
	def validate(self):
		if self.country == "India" and not self.state:
			frappe.throw("State is required when Country is India")


def on_update(doc, method=None):
	# Keep last_contact_on fresh when a log is added
	if doc.logs:
		latest = max((row.log_time for row in doc.logs if row.log_time), default=None)
		if latest and doc.last_contact_on != latest:
			frappe.db.set_value("IC Lead", doc.name, "last_contact_on", latest, update_modified=False)
''',
    )

    write_doctype(
        "ic_bank_detail",
        {
            "name": "IC Bank Detail",
            "autoname": "format:BANK-{####}",
            "title_field": "account_name",
            "search_fields": "account_name,bank_name,account_number",
            "fields": [
                field(fieldname="account_name", label="Account Name", fieldtype="Data", reqd=1, in_list_view=1),
                field(fieldname="bank_name", label="Bank Name", fieldtype="Data", reqd=1, in_list_view=1),
                field(fieldname="account_number", label="Account Number", fieldtype="Data", reqd=1),
                field(fieldname="ifsc", label="IFSC", fieldtype="Data", reqd=1),
                field(fieldname="column_break_1", fieldtype="Column Break"),
                field(fieldname="branch", label="Branch", fieldtype="Data"),
                field(fieldname="upi", label="UPI", fieldtype="Data"),
                field(fieldname="is_default", label="Default", fieldtype="Check", default="0"),
                field(fieldname="section_notes", fieldtype="Section Break"),
                field(fieldname="notes", label="Notes", fieldtype="Small Text"),
            ],
            "permissions": [
                perm("System Manager", delete=1, export=1, import_=1),
                perm("IC Admin", delete=1, export=1, import_=1),
                # Sales can read bank profiles to put on quotes, not edit master
                {
                    "role": "IC Sales Ops",
                    "read": 1,
                    "write": 0,
                    "create": 0,
                    "delete": 0,
                    "report": 1,
                    "export": 0,
                    "share": 0,
                    "print": 1,
                    "email": 0,
                },
            ],
        },
    )

    write_doctype(
        "ic_document_library_item",
        {
            "name": "IC Document Library Item",
            "istable": 1,
            "fields": [
                field(fieldname="document_name", label="Document Name", fieldtype="Data", reqd=1, in_list_view=1),
                field(fieldname="description", label="Description", fieldtype="Small Text", in_list_view=1),
                field(fieldname="required", label="Required", fieldtype="Check", default="1", in_list_view=1),
                field(fieldname="active", label="Active", fieldtype="Check", default="1", in_list_view=1),
            ],
            "permissions": [],
        },
    )

    write_doctype(
        "ic_service",
        {
            "name": "IC Service",
            "autoname": "field:service_name",
            "naming_rule": "By fieldname",
            "title_field": "service_name",
            "fields": [
                field(fieldname="service_name", label="Service Name", fieldtype="Data", reqd=1, unique=1),
                field(fieldname="active", label="Active", fieldtype="Check", default="1"),
                field(fieldname="description", label="Description", fieldtype="Small Text"),
                field(fieldname="section_docs", label="Document Library", fieldtype="Section Break"),
                field(fieldname="documents", label="Documents", fieldtype="Table", options="IC Document Library Item"),
            ],
        },
    )

    write_doctype(
        "ic_testing_service",
        {
            "name": "IC Testing Service",
            "autoname": "format:TEST-{####}",
            "title_field": "test_name",
            "search_fields": "test_name,lab_name",
            "fields": [
                field(fieldname="test_name", label="Test Name", fieldtype="Data", reqd=1, in_list_view=1),
                field(fieldname="lab_name", label="Lab Name", fieldtype="Data", reqd=1, in_list_view=1),
                field(fieldname="selling_price", label="Selling Price", fieldtype="Currency", reqd=1, in_list_view=1),
                field(fieldname="column_break_1", fieldtype="Column Break"),
                field(
                    fieldname="purchase_price",
                    label="Purchase Price",
                    fieldtype="Currency",
                    reqd=1,
                    description="Visible to IC Admin / System Manager only",
                ),
                field(fieldname="active", label="Active", fieldtype="Check", default="1"),
                field(fieldname="section_desc", fieldtype="Section Break"),
                field(fieldname="description", label="Description", fieldtype="Small Text"),
            ],
        },
    )

    write_doctype(
        "ic_quote_testing_item",
        {
            "name": "IC Quote Testing Item",
            "istable": 1,
            "fields": [
                field(fieldname="testing_service", label="Testing Service", fieldtype="Link", options="IC Testing Service", in_list_view=1),
                field(fieldname="test_name", label="Test Name", fieldtype="Data", reqd=1, in_list_view=1),
                field(fieldname="lab_name", label="Lab Name", fieldtype="Data", in_list_view=1),
                field(fieldname="selling_price", label="Selling Price", fieldtype="Currency", reqd=1, in_list_view=1),
            ],
            "permissions": [],
        },
    )

    write_doctype(
        "ic_quote_template",
        {
            "name": "IC Quote Template",
            "autoname": "field:template_name",
            "naming_rule": "By fieldname",
            "title_field": "template_name",
            "fields": [
                field(fieldname="template_name", label="Template Name", fieldtype="Data", reqd=1, unique=1),
                field(fieldname="service", label="Service", fieldtype="Link", options="IC Service"),
                field(fieldname="validity_days", label="Validity Days", fieldtype="Int", default="30"),
                field(fieldname="column_break_1", fieldtype="Column Break"),
                field(fieldname="consulting_price", label="Consulting Price", fieldtype="Currency", default="0"),
                field(fieldname="testing_price", label="Testing Price", fieldtype="Currency", default="0"),
                field(fieldname="other_commercials", label="Other Commercials", fieldtype="Currency", default="0"),
                field(fieldname="section_body", label="Letter Body", fieldtype="Section Break"),
                field(fieldname="body_html", label="Body HTML", fieldtype="Text Editor"),
                field(fieldname="other_commercials_note", label="Other Commercials Note", fieldtype="Data"),
                field(fieldname="section_bank", label="Banking (Admin only edit)", fieldtype="Section Break"),
                field(fieldname="bank_detail", label="Bank Detail", fieldtype="Link", options="IC Bank Detail"),
            ],
        },
    )

    write_doctype(
        "ic_quote",
        {
            "name": "IC Quote",
            "autoname": "naming_series:",
            "naming_rule": "By \"Naming Series\" field",
            "title_field": "quote_number",
            "search_fields": "quote_number,customer_name,company,status,service",
            "fields": [
                field(fieldname="naming_series", label="Series", fieldtype="Select", options="ICQ-.YYYY.-", default="ICQ-.YYYY.-", reqd=1),
                field(fieldname="quote_number", label="Quote Number", fieldtype="Data", read_only=1, in_list_view=1),
                field(fieldname="public_token", label="Public Token", fieldtype="Data", read_only=1, hidden=1),
                field(fieldname="status", label="Status", fieldtype="Select", options="Draft\nShared\nRevision Requested\nAccepted\nSuperseded", default="Draft", reqd=1, in_list_view=1),
                field(fieldname="column_break_1", fieldtype="Column Break"),
                field(fieldname="lead", label="Lead", fieldtype="Link", options="IC Lead"),
                field(fieldname="template", label="Template", fieldtype="Link", options="IC Quote Template"),
                field(fieldname="validity_date", label="Validity Date", fieldtype="Date", reqd=1),
                field(fieldname="section_customer", label="Customer", fieldtype="Section Break"),
                field(fieldname="customer_name", label="Customer Name", fieldtype="Data", reqd=1, in_list_view=1),
                field(fieldname="company", label="Company", fieldtype="Data", reqd=1, in_list_view=1),
                field(fieldname="email", label="Email", fieldtype="Data", options="Email", reqd=1),
                field(fieldname="column_break_2", fieldtype="Column Break"),
                field(fieldname="phone", label="Phone", fieldtype="Data", reqd=1),
                field(fieldname="country", label="Country", fieldtype="Link", options="Country", default="India", reqd=1),
                field(fieldname="state", label="State", fieldtype="Data"),
                field(fieldname="section_service", label="Service & Scope", fieldtype="Section Break"),
                field(fieldname="service", label="Service", fieldtype="Link", options="IC Service", reqd=1, in_list_view=1),
                field(fieldname="description", label="Description", fieldtype="Small Text", reqd=1),
                field(fieldname="body_html", label="Letter Body", fieldtype="Text Editor"),
                field(fieldname="section_testing", label="Testing Lines (Selling Price only)", fieldtype="Section Break"),
                field(fieldname="testing_items", label="Testing Items", fieldtype="Table", options="IC Quote Testing Item"),
                field(fieldname="section_commercials", label="Commercials", fieldtype="Section Break"),
                field(fieldname="consulting_price", label="Commercial Consulting Price", fieldtype="Currency", default="0"),
                field(fieldname="testing_price", label="Testing Price", fieldtype="Currency", default="0"),
                field(fieldname="other_commercials", label="Other Commercials", fieldtype="Currency", default="0", description="Included in revenue"),
                field(fieldname="column_break_3", fieldtype="Column Break"),
                field(fieldname="other_commercials_note", label="Other Commercials Note", fieldtype="Data"),
                field(fieldname="total_revenue", label="Total Revenue", fieldtype="Currency", read_only=1),
                field(fieldname="section_bank", label="Banking Details", fieldtype="Section Break"),
                field(fieldname="bank_detail", label="Bank Profile", fieldtype="Link", options="IC Bank Detail"),
                field(fieldname="bank_snapshot", label="Banking Text on Quote", fieldtype="Small Text"),
                field(fieldname="section_customer_response", label="Customer Response", fieldtype="Section Break"),
                field(fieldname="customer_remark", label="Customer Remark", fieldtype="Small Text", read_only=1),
                field(fieldname="revision_message", label="Revision Message", fieldtype="Small Text", read_only=1),
                field(fieldname="shared_on", label="Shared On", fieldtype="Datetime", read_only=1),
                field(fieldname="accepted_on", label="Accepted On", fieldtype="Datetime", read_only=1),
                field(fieldname="public_url", label="Public URL", fieldtype="Small Text", read_only=1),
            ],
        },
        controller='''# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

import secrets

import frappe
from frappe.model.document import Document
from frappe.utils import flt, get_url


class ICQuote(Document):
	def validate(self):
		self.quote_number = self.quote_number or self.name
		self.total_revenue = flt(self.consulting_price) + flt(self.testing_price) + flt(self.other_commercials)
		if self.testing_items:
			self.testing_price = sum(flt(row.selling_price) for row in self.testing_items)
			self.total_revenue = flt(self.consulting_price) + flt(self.testing_price) + flt(self.other_commercials)
		if self.bank_detail and not self.bank_snapshot:
			self.bank_snapshot = bank_detail_to_text(self.bank_detail)
		if self.public_token:
			self.public_url = get_url(f"/q/{self.public_token}")

	def before_insert(self):
		if not self.public_token:
			self.public_token = secrets.token_hex(16)
		if not self.bank_detail:
			default_bank = frappe.db.get_value("IC Bank Detail", {"is_default": 1}, "name")
			if default_bank:
				self.bank_detail = default_bank
				self.bank_snapshot = bank_detail_to_text(default_bank)


def bank_detail_to_text(bank_name: str) -> str:
	bank = frappe.get_doc("IC Bank Detail", bank_name)
	lines = [
		f"Account Name: {bank.account_name}",
		f"Bank: {bank.bank_name}",
		f"Account Number: {bank.account_number}",
		f"IFSC: {bank.ifsc}",
	]
	if bank.branch:
		lines.append(f"Branch: {bank.branch}")
	if bank.upi:
		lines.append(f"UPI: {bank.upi}")
	if bank.notes:
		lines.append(f"Note: {bank.notes}")
	return "\\n".join(lines)


def before_insert(doc, method=None):
	doc.before_insert()


def on_update(doc, method=None):
	if doc.lead and doc.status in {"Shared", "Accepted"}:
		status = "QUOTE_SENT" if doc.status == "Shared" else "WON"
		frappe.db.set_value("IC Lead", doc.lead, "status", status, update_modified=False)
''',
    )

    write_doctype(
        "ic_customer_upload",
        {
            "name": "IC Customer Upload",
            "istable": 1,
            "fields": [
                field(fieldname="document_name", label="Document", fieldtype="Data", in_list_view=1),
                field(fieldname="file", label="File", fieldtype="Attach", in_list_view=1),
                field(fieldname="remark", label="Remark", fieldtype="Small Text", in_list_view=1),
                field(fieldname="uploaded_on", label="Uploaded On", fieldtype="Datetime", default="Now"),
            ],
            "permissions": [],
        },
    )

    write_doctype(
        "ic_document_request",
        {
            "name": "IC Document Request",
            "autoname": "format:DOC-{####}",
            "title_field": "quote",
            "fields": [
                field(fieldname="quote", label="Quote", fieldtype="Link", options="IC Quote", reqd=1, in_list_view=1),
                field(fieldname="service", label="Service", fieldtype="Link", options="IC Service", reqd=1, in_list_view=1),
                field(fieldname="status", label="Status", fieldtype="Select", options="Shared\nUploaded\nFinal\nNeeds More", default="Shared", in_list_view=1),
                field(fieldname="column_break_1", fieldtype="Column Break"),
                field(fieldname="public_token", label="Public Token", fieldtype="Data", read_only=1, hidden=1),
                field(fieldname="public_url", label="Customer Link", fieldtype="Small Text", read_only=1),
                field(fieldname="section_notes", fieldtype="Section Break"),
                field(fieldname="questionnaire", label="Questionnaire / Remarks", fieldtype="Small Text"),
                field(fieldname="team_remark", label="Team Remark to Customer", fieldtype="Small Text"),
                field(fieldname="customer_final_note", label="Customer Final Note", fieldtype="Small Text", read_only=1),
                field(fieldname="section_uploads", label="Uploads", fieldtype="Section Break"),
                field(fieldname="uploads", label="Uploads", fieldtype="Table", options="IC Customer Upload"),
            ],
        },
        controller='''# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

import secrets

import frappe
from frappe.model.document import Document
from frappe.utils import get_url


class ICDocumentRequest(Document):
	def before_insert(self):
		if not self.public_token:
			self.public_token = secrets.token_hex(16)
		self.public_url = get_url(f"/d/{self.public_token}")

	def validate(self):
		if self.public_token:
			self.public_url = get_url(f"/d/{self.public_token}")
		quote_status = frappe.db.get_value("IC Quote", self.quote, "status")
		if quote_status != "Accepted" and self.is_new():
			frappe.throw("Document checklist can be shared only after quote is Accepted")
''',
    )

    write_doctype(
        "ic_report",
        {
            "name": "IC Report",
            "autoname": "format:RPT-{####}",
            "title_field": "title",
            "search_fields": "title,quote,status",
            "fields": [
                field(fieldname="title", label="Title", fieldtype="Data", reqd=1, in_list_view=1),
                field(fieldname="quote", label="Quote", fieldtype="Link", options="IC Quote", reqd=1, in_list_view=1),
                field(fieldname="status", label="Status", fieldtype="Select", options="Ready\nRevoked", default="Ready", in_list_view=1),
                field(fieldname="column_break_1", fieldtype="Column Break"),
                field(fieldname="report_file", label="Report File", fieldtype="Attach", reqd=1),
                field(fieldname="shared_on", label="Shared On", fieldtype="Datetime", default="Now", read_only=1),
                field(fieldname="public_token", label="Public Token", fieldtype="Data", read_only=1, hidden=1),
                field(fieldname="public_url", label="Customer Link", fieldtype="Small Text", read_only=1),
                field(fieldname="section_msg", fieldtype="Section Break"),
                field(fieldname="message", label="Message for Customer", fieldtype="Small Text", default="Your report is ready to download."),
            ],
        },
        controller='''# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

import secrets

import frappe
from frappe.model.document import Document
from frappe.utils import get_url, now_datetime


class ICReport(Document):
	def before_insert(self):
		if not self.public_token:
			self.public_token = secrets.token_hex(16)
		self.shared_on = self.shared_on or now_datetime()
		self.public_url = get_url(f"/r/{self.public_token}")

	def validate(self):
		quote_status = frappe.db.get_value("IC Quote", self.quote, "status")
		if quote_status != "Accepted":
			frappe.throw("Reports can be shared after the quote is Accepted")
		if self.public_token:
			self.public_url = get_url(f"/r/{self.public_token}")
''',
    )

    print(f"Generated DocTypes under {ROOT}")


if __name__ == "__main__":
    main()
