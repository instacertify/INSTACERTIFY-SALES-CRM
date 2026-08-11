// Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
// For license information, please see license.txt

frappe.ui.form.on("IC Document Request", {
	refresh(frm) {
		if (frm.doc.public_url) {
			frm
				.add_custom_button(__("Copy Customer Link"), () => {
					instacertify_crm.copy_text(frm.doc.public_url);
				})
				.addClass("btn-primary");
		}
		if (frm.is_new() && frm.doc.service && !(frm.doc.requested_documents || []).length) {
			frappe.call({
				method: "instacertify_crm.api.get_service_documents",
				args: { service: frm.doc.service },
				callback(r) {
					(r.message || []).forEach((d) => {
						frm.add_child("requested_documents", {
							document_name: d.document_name,
							description: d.description,
							required: d.required,
						});
					});
					frm.refresh_field("requested_documents");
				},
			});
		}
		if (!frm.is_new()) {
			frm.add_custom_button(__("Ask for missing / extra docs"), () => {
				frappe.prompt(
					{
						fieldname: "team_remark",
						label: __("What is missing or extra?"),
						fieldtype: "Small Text",
						reqd: 1,
					},
					(values) => {
						frm.set_value({
							team_remark: values.team_remark,
							status: "Needs More",
						});
						frm.save();
					},
					__("Notify customer"),
				);
			});
		}
	},

	service(frm) {
		if (!frm.doc.service) return;
		frappe.confirm(
			__("Load document checklist from this service into the selection table?"),
			() => {
				frappe.call({
					method: "instacertify_crm.api.get_service_documents",
					args: { service: frm.doc.service },
					callback(r) {
						frm.clear_table("requested_documents");
						(r.message || []).forEach((d) => {
							frm.add_child("requested_documents", {
								document_name: d.document_name,
								description: d.description,
								required: d.required,
							});
						});
						frm.refresh_field("requested_documents");
					},
				});
			},
		);
	},
});
