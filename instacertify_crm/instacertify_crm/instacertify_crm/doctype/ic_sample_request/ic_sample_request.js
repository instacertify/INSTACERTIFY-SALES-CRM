// Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
// For license information, please see license.txt

const SAMPLE_FLOW = [
	"Awaiting Sample",
	"Sample Received",
	"Dispatched to Lab",
	"Testing In Process",
	"Report Available",
	"Report Uploaded",
	"Shared with Customer",
	"Closed",
];

frappe.ui.form.on("IC Sample Request", {
	refresh(frm) {
		if (frm.doc.public_url) {
			frm.add_custom_button(__("Copy tracking link"), () => {
				instacertify_crm.copy_text(frm.doc.public_url);
			});
		}
		if (frm.is_new()) return;
		const idx = SAMPLE_FLOW.indexOf(frm.doc.status);
		if (idx >= 0 && idx < SAMPLE_FLOW.length - 1) {
			const next = SAMPLE_FLOW[idx + 1];
			frm
				.add_custom_button(__("Advance → {0}", [next]), () => {
					frm.set_value("status", next);
					if (next === "Report Uploaded" && !frm.doc.report_file) {
						frappe.msgprint(__("Attach the report file before sharing with the customer."));
					}
					frm.save();
				})
				.addClass("btn-primary");
		}
		if (frm.doc.status === "Report Uploaded" || frm.doc.status === "Report Available") {
			frm.add_custom_button(__("Share report link"), () => {
				frm.set_value("status", "Shared with Customer");
				frm.save().then(() => {
					if (frm.doc.public_url) instacertify_crm.copy_text(frm.doc.public_url);
				});
			});
		}
	},
});
