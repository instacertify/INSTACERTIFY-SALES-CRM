// Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
// For license information, please see license.txt

frappe.ui.form.on("IC Delivery Record", {
	refresh(frm) {
		if (frm.doc.project) {
			frm.add_custom_button(__("Open Project"), () => {
				frappe.set_route("Form", "IC Customer Project", frm.doc.project);
			});
		}
		if (frm.doc.lead) {
			frm.add_custom_button(__("Customer Lifecycle"), () => {
				instacertify_crm.show_customer_lifecycle({ lead: frm.doc.lead });
			});
		}
	},
	quote(frm) {
		if (!frm.doc.quote) return;
		frappe.db.get_doc("IC Quote", frm.doc.quote).then((q) => {
			frm.set_value({
				customer_name: q.customer_name,
				company: q.company,
				email: q.email,
				lead: q.lead,
				service: q.service,
			});
		});
	},
	lead(frm) {
		if (!frm.doc.lead) return;
		frappe.db.get_doc("IC Lead", frm.doc.lead).then((l) => {
			frm.set_value({
				customer_name: l.customer_name,
				company: l.company,
				email: l.email,
			});
		});
	},
});
