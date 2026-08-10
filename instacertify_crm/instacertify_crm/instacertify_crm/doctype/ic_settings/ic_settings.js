// Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
// For license information, please see license.txt

frappe.ui.form.on("IC Settings", {
	refresh(frm) {
		frm.set_intro(
			__(
				"Upload logos here to brand quotes, letterhead and customer portals. IC Admin can edit.",
			),
		);
		if (frm.doc.company_logo || frm.doc.letterhead_logo) {
			frm.add_custom_button(__("Preview quote letterhead"), () => {
				frappe.set_route("List", "IC Quote");
			});
		}
		frm.add_custom_button(__("Sync Letter Head now"), () => {
			frappe.call({
				method: "instacertify_crm.api.sync_branding",
				freeze: true,
				callback() {
					frappe.show_alert({ message: __("Branding synced"), indicator: "green" });
				},
			});
		});
	},
});
