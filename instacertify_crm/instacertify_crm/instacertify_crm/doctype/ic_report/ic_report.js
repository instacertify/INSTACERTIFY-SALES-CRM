// Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
// For license information, please see license.txt

frappe.ui.form.on("IC Report", {
	refresh(frm) {
		if (frm.doc.public_url) {
			frm.add_custom_button(__("Copy Customer Link"), () => {
				instacertify_crm.copy_text(frm.doc.public_url);
			}).addClass("btn-primary");
			frm.add_custom_button(__("Open Customer Page"), () => {
				window.open(frm.doc.public_url, "_blank");
			});
		}
	},
});
