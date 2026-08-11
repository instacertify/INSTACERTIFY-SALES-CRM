# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document

from instacertify_crm.permissions import is_ic_admin


class ICQuoteTemplate(Document):
	def validate(self):
		# Sales Ops may create; only IC Admin / System Manager may edit afterwards.
		if not self.is_new() and not is_ic_admin():
			frappe.throw(_("Only IC Admin can edit quote templates"), frappe.PermissionError)
