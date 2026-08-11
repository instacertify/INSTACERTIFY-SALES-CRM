// Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
// For license information, please see license.txt

frappe.ui.form.on("IC Lab", {
	refresh(frm) {
		if (!frm.is_new()) {
			frm.add_custom_button(__("Add Test to Library"), () => {
				frappe.new_doc("IC Testing Service", {
					lab: frm.doc.name,
					lab_name: frm.doc.lab_name,
				});
			});
		}
	},
});

frappe.ui.form.on("IC Lab Contact", {
	is_primary(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (!row.is_primary) return;
		(frm.doc.contacts || []).forEach((r) => {
			if (r.name !== row.name && r.is_primary) {
				frappe.model.set_value(r.doctype, r.name, "is_primary", 0);
			}
		});
	},
});

frappe.listview_settings["IC Lab"] = {
	add_fields: ["active", "city", "primary_contact", "accreditation_valid_upto"],
	get_indicator(doc) {
		if (!doc.active) {
			return [__("Inactive"), "gray", "active,=,0"];
		}
		return [__("Active"), "green", "active,=,1"];
	},
};
