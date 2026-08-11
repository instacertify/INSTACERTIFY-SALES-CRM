// Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
// For license information, please see license.txt

frappe.ui.form.on("IC Renewal Reminder", {
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
		if (!frm.is_new() && frm.doc.status === "Scheduled") {
			frm
				.add_custom_button(__("Mark Done"), () => {
					frm.set_value("status", "Done");
					frm.save();
				})
				.addClass("btn-primary");
		}
	},
});

frappe.listview_settings["IC Renewal Reminder"] = {
	add_fields: ["status", "remind_on", "interval_label"],
	get_indicator(doc) {
		const colors = {
			Scheduled: "orange",
			Notified: "blue",
			Done: "green",
			Cancelled: "gray",
		};
		return [__(doc.status), colors[doc.status] || "gray", `status,=,${doc.status}`];
	},
};
