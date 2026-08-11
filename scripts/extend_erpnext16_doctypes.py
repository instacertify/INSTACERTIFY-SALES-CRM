#!/usr/bin/env python3
"""Extend Instacertify ERPNext 16 app with samples, assets, HR, consultants, roles."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "instacertify_crm/instacertify_crm/instacertify_crm/doctype"
sys.path.insert(0, str(Path(__file__).resolve().parent))
from generate_frappe_doctypes import field, perm, write_doctype  # noqa: E402


IC_ROLES_PERMS = [
    perm("System Manager", delete=1, export=1, import_=1),
    perm("IC Admin", delete=1, export=1, import_=1),
    perm("IC All Ops Manager", delete=0, export=1, import_=0),
    perm("IC Operations Manager", delete=0, export=0, import_=0),
    perm("IC Sales Person", delete=0, export=0, import_=0),
    perm("IC Sales Ops", delete=0, export=0, import_=0),
]


def write(name: str, meta: dict, controller: str = ""):
    meta = {**meta, "permissions": meta.get("permissions", IC_ROLES_PERMS)}
    write_doctype(name, meta, controller=controller)


def main():
    ROOT.mkdir(parents=True, exist_ok=True)

    write(
        "ic_consultant",
        {
            "name": "IC Consultant",
            "autoname": "field:consultant_name",
            "naming_rule": "By fieldname",
            "title_field": "consultant_name",
            "search_fields": "consultant_name,company,email,phone",
            "fields": [
                field(fieldname="consultant_name", label="Consultant Name", fieldtype="Data", reqd=1, unique=1, in_list_view=1),
                field(fieldname="company", label="Company / Firm", fieldtype="Data", in_list_view=1),
                field(fieldname="column_break_1", fieldtype="Column Break"),
                field(fieldname="email", label="Email", fieldtype="Data", options="Email", in_list_view=1),
                field(fieldname="phone", label="Phone", fieldtype="Data", in_list_view=1),
                field(fieldname="section_meta", fieldtype="Section Break"),
                field(fieldname="active", label="Active", fieldtype="Check", default=1),
                field(fieldname="notes", label="Notes", fieldtype="Small Text"),
            ],
        },
    )

    write(
        "ic_sample_request",
        {
            "name": "IC Sample Request",
            "autoname": "naming_series:",
            "naming_rule": 'By "Naming Series" field',
            "title_field": "sample_label",
            "search_fields": "sample_label,company,status,tracking_code",
            "fields": [
                field(fieldname="naming_series", label="Series", fieldtype="Select", options="IC-SMP-.YYYY.-", default="IC-SMP-.YYYY.-", reqd=1),
                field(fieldname="sample_label", label="Sample Label", fieldtype="Data", reqd=1, in_list_view=1),
                field(fieldname="tracking_code", label="Tracking Code", fieldtype="Data", unique=1, read_only=1, in_list_view=1),
                field(fieldname="public_token", label="Public Token", fieldtype="Data", unique=1, read_only=1, hidden=1),
                field(fieldname="column_break_1", fieldtype="Column Break"),
                field(
                    fieldname="status",
                    label="Status",
                    fieldtype="Select",
                    options="\nAwaiting Sample\nSample Received\nDispatched to Lab\nTesting In Process\nReport Available\nReport Uploaded\nShared with Customer\nClosed",
                    default="Awaiting Sample",
                    reqd=1,
                    in_list_view=1,
                ),
                field(fieldname="quote", label="Quote", fieldtype="Link", options="IC Quote"),
                field(fieldname="project", label="Customer Project", fieldtype="Link", options="IC Customer Project"),
                field(fieldname="section_customer", label="Customer", fieldtype="Section Break"),
                field(fieldname="customer_name", label="Customer Name", fieldtype="Data", reqd=1),
                field(fieldname="company", label="Company", fieldtype="Data", reqd=1, in_list_view=1),
                field(fieldname="column_break_2", fieldtype="Column Break"),
                field(fieldname="email", label="Email", fieldtype="Data", options="Email"),
                field(fieldname="phone", label="Phone", fieldtype="Data"),
                field(fieldname="section_test", label="Testing", fieldtype="Section Break"),
                field(fieldname="lab", label="Lab", fieldtype="Link", options="IC Lab"),
                field(fieldname="testing_service", label="Testing Service", fieldtype="Link", options="IC Testing Service"),
                field(fieldname="standard_code", label="Applicable Standard", fieldtype="Data"),
                field(fieldname="column_break_3", fieldtype="Column Break"),
                field(fieldname="no_of_samples", label="No. of Samples", fieldtype="Int", default=1),
                field(fieldname="accreditation", label="Lab Accreditation", fieldtype="Data"),
                field(fieldname="testing_timeline", label="Testing Timeline", fieldtype="Data"),
                field(fieldname="section_dates", label="Logistics", fieldtype="Section Break"),
                field(fieldname="received_on", label="Sample Received On", fieldtype="Datetime"),
                field(fieldname="dispatched_on", label="Dispatched to Lab On", fieldtype="Datetime"),
                field(fieldname="testing_started_on", label="Testing Started On", fieldtype="Datetime"),
                field(fieldname="column_break_4", fieldtype="Column Break"),
                field(fieldname="report_ready_on", label="Report Available On", fieldtype="Datetime"),
                field(fieldname="report_file", label="Report File", fieldtype="Attach"),
                field(fieldname="shared_on", label="Shared with Customer On", fieldtype="Datetime"),
                field(fieldname="public_url", label="Customer / Courier Link", fieldtype="Data", read_only=1),
                field(fieldname="qr_html", label="Sample QR", fieldtype="HTML"),
                field(fieldname="notes", label="Notes", fieldtype="Small Text"),
            ],
        },
        controller='''# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

import secrets
import frappe
from frappe.model.document import Document
from frappe.utils import get_url, now_datetime


class ICSampleRequest(Document):
	def before_insert(self):
		if not self.public_token:
			self.public_token = secrets.token_hex(16)
		if not self.tracking_code:
			self.tracking_code = f"SMP-{secrets.token_hex(4).upper()}"
		self.public_url = get_url(f"/s/{self.public_token}")

	def validate(self):
		self.public_url = get_url(f"/s/{self.public_token}") if self.public_token else ""
		self.qr_html = (
			f'<img alt="Sample QR" width="140" height="140" '
			f'src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data={frappe.utils.quote(self.public_url)}" />'
			if self.public_url
			else ""
		)

	def on_update(self):
		# stamp timestamps when status advances
		now = now_datetime()
		map_ = {
			"Sample Received": "received_on",
			"Dispatched to Lab": "dispatched_on",
			"Testing In Process": "testing_started_on",
			"Report Available": "report_ready_on",
			"Shared with Customer": "shared_on",
		}
		field = map_.get(self.status)
		if field and not self.get(field):
			self.db_set(field, now, update_modified=False)
''',
    )

    write(
        "ic_asset_register",
        {
            "name": "IC Asset Register",
            "autoname": "naming_series:",
            "naming_rule": 'By "Naming Series" field',
            "title_field": "asset_name",
            "search_fields": "asset_code,asset_name,custodian,status",
            "fields": [
                field(fieldname="naming_series", label="Series", fieldtype="Select", options="IC-AST-.YYYY.-", default="IC-AST-.YYYY.-", reqd=1),
                field(fieldname="asset_code", label="Asset Code", fieldtype="Data", unique=1, read_only=1, in_list_view=1),
                field(fieldname="asset_name", label="Asset Name", fieldtype="Data", reqd=1, in_list_view=1),
                field(fieldname="column_break_1", fieldtype="Column Break"),
                field(fieldname="category", label="Category", fieldtype="Select", options="\nLaptop\nPhone\nLab Equipment\nFurniture\nVehicle\nSoftware\nOther", default="Other"),
                field(fieldname="status", label="Status", fieldtype="Select", options="\nAvailable\nAssigned\nUnder Repair\nRetired\nLost", default="Available", in_list_view=1),
                field(fieldname="section_value", label="Value & Custody", fieldtype="Section Break"),
                field(fieldname="purchase_value", label="Asset Value", fieldtype="Currency", in_list_view=1),
                field(fieldname="purchase_date", label="Acquired On", fieldtype="Date"),
                field(fieldname="column_break_2", fieldtype="Column Break"),
                field(fieldname="custodian", label="Who Has The Asset", fieldtype="Link", options="User", in_list_view=1),
                field(fieldname="location", label="Location", fieldtype="Data"),
                field(fieldname="notes", label="Notes", fieldtype="Small Text"),
                field(fieldname="attachment", label="Invoice / Photo", fieldtype="Attach"),
            ],
        },
        controller='''# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class ICAssetRegister(Document):
	def before_insert(self):
		if not self.asset_code:
			year = frappe.utils.now_datetime().year
			count = frappe.db.count("IC Asset Register") + 1
			self.asset_code = f"AST-{year}-{count:05d}"
		if self.custodian and self.status == "Available":
			self.status = "Assigned"
''',
    )

    write(
        "ic_holiday",
        {
            "name": "IC Holiday",
            "autoname": "format:IC-HOL-{#####}",
            "title_field": "holiday_name",
            "search_fields": "holiday_name,holiday_date",
            "fields": [
                field(fieldname="holiday_name", label="Holiday Name", fieldtype="Data", reqd=1, in_list_view=1),
                field(fieldname="holiday_date", label="Date", fieldtype="Date", reqd=1, in_list_view=1),
                field(fieldname="column_break_1", fieldtype="Column Break"),
                field(fieldname="holiday_type", label="Type", fieldtype="Select", options="\nNational\nRegional\nOptional\nCompany", default="Company", in_list_view=1),
                field(fieldname="active", label="Active", fieldtype="Check", default=1),
                field(fieldname="notes", label="Notes", fieldtype="Small Text"),
            ],
        },
    )

    write(
        "ic_employee_profile",
        {
            "name": "IC Employee Profile",
            "autoname": "naming_series:",
            "naming_rule": 'By "Naming Series" field',
            "title_field": "employee_name",
            "search_fields": "employee_code,employee_name,user,status",
            "fields": [
                field(fieldname="naming_series", label="Series", fieldtype="Select", options="IC-EMP-.YYYY.-", default="IC-EMP-.YYYY.-", reqd=1),
                field(fieldname="employee_code", label="Employee Code", fieldtype="Data", unique=1, in_list_view=1),
                field(fieldname="employee_name", label="Employee Name", fieldtype="Data", reqd=1, in_list_view=1),
                field(fieldname="user", label="User", fieldtype="Link", options="User", reqd=1, unique=1),
                field(fieldname="column_break_1", fieldtype="Column Break"),
                field(fieldname="department", label="Department", fieldtype="Data", in_list_view=1),
                field(fieldname="designation", label="Designation", fieldtype="Data"),
                field(fieldname="status", label="Status", fieldtype="Select", options="\nDraft\nPending Approval\nActive\nLeft", default="Draft", in_list_view=1),
                field(fieldname="section_hr", label="HR Details", fieldtype="Section Break"),
                field(fieldname="date_of_joining", label="Date of Joining", fieldtype="Date"),
                field(fieldname="monthly_ctc", label="Monthly CTC", fieldtype="Currency"),
                field(fieldname="column_break_2", fieldtype="Column Break"),
                field(fieldname="phone", label="Phone", fieldtype="Data"),
                field(fieldname="manager", label="Reporting Manager", fieldtype="Link", options="User"),
                field(fieldname="section_docs", label="Documents", fieldtype="Section Break"),
                field(fieldname="joining_letter", label="Joining Letter", fieldtype="Attach"),
                field(fieldname="joining_letter_qr", label="Joining Letter QR", fieldtype="HTML"),
                field(fieldname="public_token", label="Public Token", fieldtype="Data", unique=1, read_only=1, hidden=1),
                field(fieldname="notes", label="Notes", fieldtype="Small Text"),
            ],
        },
        controller='''# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

import secrets
import frappe
from frappe.model.document import Document
from frappe.utils import get_url


class ICEmployeeProfile(Document):
	def before_insert(self):
		if not self.public_token:
			self.public_token = secrets.token_hex(12)
		if not self.employee_code:
			year = frappe.utils.now_datetime().year
			count = frappe.db.count("IC Employee Profile") + 1
			self.employee_code = f"EMP-{year}-{count:04d}"

	def validate(self):
		url = get_url(f"/emp/{self.public_token}") if self.public_token else ""
		self.joining_letter_qr = (
			f'<img alt="Joining QR" width="120" height="120" '
			f'src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data={frappe.utils.quote(url)}" />'
			if url
			else ""
		)
''',
    )

    write(
        "ic_salary_slip",
        {
            "name": "IC Salary Slip",
            "autoname": "naming_series:",
            "naming_rule": 'By "Naming Series" field',
            "title_field": "employee_name",
            "search_fields": "employee,employee_name,month,year",
            "fields": [
                field(fieldname="naming_series", label="Series", fieldtype="Select", options="IC-SAL-.YYYY.-", default="IC-SAL-.YYYY.-", reqd=1),
                field(fieldname="employee", label="Employee Profile", fieldtype="Link", options="IC Employee Profile", reqd=1, in_list_view=1),
                field(fieldname="employee_name", label="Employee Name", fieldtype="Data", fetch_from="employee.employee_name", read_only=1, in_list_view=1),
                field(fieldname="user", label="User", fieldtype="Link", options="User", fetch_from="employee.user", read_only=1),
                field(fieldname="column_break_1", fieldtype="Column Break"),
                field(fieldname="month", label="Month", fieldtype="Select", options="\nJanuary\nFebruary\nMarch\nApril\nMay\nJune\nJuly\nAugust\nSeptember\nOctober\nNovember\nDecember", reqd=1, in_list_view=1),
                field(fieldname="year", label="Year", fieldtype="Int", reqd=1, in_list_view=1),
                field(fieldname="net_pay", label="Net Pay", fieldtype="Currency", reqd=1),
                field(fieldname="section_file", label="Slip", fieldtype="Section Break"),
                field(fieldname="slip_file", label="Salary Slip PDF", fieldtype="Attach", reqd=1),
                field(fieldname="notes", label="Notes", fieldtype="Small Text"),
            ],
            "permissions": [
                perm("System Manager", delete=1, export=1, import_=1),
                perm("IC Admin", delete=1, export=1, import_=1),
                perm("IC All Ops Manager", read=1, write=0, create=0, delete=0, export=0),
                perm("IC Operations Manager", read=1, write=0, create=0, delete=0, export=0),
                perm("IC Sales Person", read=1, write=0, create=0, delete=0, export=0),
                perm("IC Sales Ops", read=1, write=0, create=0, delete=0, export=0),
            ],
        },
    )

    write(
        "ic_attendance",
        {
            "name": "IC Attendance",
            "autoname": "format:IC-ATT-{#####}",
            "title_field": "employee_name",
            "search_fields": "employee,attendance_date,status",
            "fields": [
                field(fieldname="employee", label="Employee Profile", fieldtype="Link", options="IC Employee Profile", reqd=1, in_list_view=1),
                field(fieldname="employee_name", label="Employee Name", fieldtype="Data", fetch_from="employee.employee_name", read_only=1, in_list_view=1),
                field(fieldname="user", label="User", fieldtype="Link", options="User", fetch_from="employee.user", read_only=1),
                field(fieldname="column_break_1", fieldtype="Column Break"),
                field(fieldname="attendance_date", label="Date", fieldtype="Date", reqd=1, in_list_view=1),
                field(fieldname="status", label="Status", fieldtype="Select", options="\nPresent\nAbsent\nHalf Day\nWork From Home\nOn Leave", default="Present", reqd=1, in_list_view=1),
                field(fieldname="check_in", label="Check In", fieldtype="Time"),
                field(fieldname="check_out", label="Check Out", fieldtype="Time"),
                field(fieldname="notes", label="Notes", fieldtype="Small Text"),
            ],
        },
    )

    write(
        "ic_customer_credential",
        {
            "name": "IC Customer Credential",
            "istable": 1,
            "editable_grid": 1,
            "fields": [
                field(fieldname="portal_name", label="Portal / System", fieldtype="Data", reqd=1, in_list_view=1),
                field(fieldname="username", label="Username / Login", fieldtype="Data", in_list_view=1),
                field(fieldname="password_hint", label="Password / Hint", fieldtype="Password", in_list_view=1),
                field(fieldname="url", label="URL", fieldtype="Data"),
                field(fieldname="notes", label="Notes", fieldtype="Small Text"),
            ],
            "permissions": [],
        },
    )

    write(
        "ic_working_hour_log",
        {
            "name": "IC Working Hour Log",
            "autoname": "format:IC-WH-{#####}",
            "title_field": "project",
            "search_fields": "project,user,work_date",
            "fields": [
                field(fieldname="project", label="Customer Project", fieldtype="Link", options="IC Customer Project", reqd=1, in_list_view=1),
                field(fieldname="user", label="Employee", fieldtype="Link", options="User", reqd=1, default="__user", in_list_view=1),
                field(fieldname="column_break_1", fieldtype="Column Break"),
                field(fieldname="work_date", label="Date", fieldtype="Date", reqd=1, default="Today", in_list_view=1),
                field(fieldname="hours", label="Hours", fieldtype="Float", reqd=1, in_list_view=1),
                field(fieldname="activity", label="Activity", fieldtype="Small Text", reqd=1),
            ],
        },
    )

    write(
        "ic_customer_incident",
        {
            "name": "IC Customer Incident",
            "autoname": "format:IC-INC-{#####}",
            "title_field": "title",
            "search_fields": "title,company,status",
            "fields": [
                field(fieldname="title", label="Title", fieldtype="Data", reqd=1, in_list_view=1),
                field(fieldname="incident_type", label="Type", fieldtype="Select", options="\nCommitment\nIncident\nEscalation\nOther", default="Commitment", in_list_view=1),
                field(fieldname="column_break_1", fieldtype="Column Break"),
                field(fieldname="status", label="Status", fieldtype="Select", options="\nOpen\nIn Progress\nResolved\nClosed", default="Open", in_list_view=1),
                field(fieldname="project", label="Customer Project", fieldtype="Link", options="IC Customer Project"),
                field(fieldname="lead", label="Lead", fieldtype="Link", options="IC Lead"),
                field(fieldname="company", label="Company", fieldtype="Data", in_list_view=1),
                field(fieldname="section_body", fieldtype="Section Break"),
                field(fieldname="details", label="Details", fieldtype="Text Editor", reqd=1),
                field(fieldname="due_date", label="Due Date", fieldtype="Date"),
                field(fieldname="attachment", label="Attachment", fieldtype="Attach"),
            ],
        },
    )

    print("Extended DocTypes written under", ROOT)


if __name__ == "__main__":
    main()
