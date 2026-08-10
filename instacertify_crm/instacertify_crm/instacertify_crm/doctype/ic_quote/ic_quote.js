// Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
// For license information, please see license.txt

frappe.ui.form.on("IC Quote", {
	setup(frm) {
		frm.set_query("template", () => ({
			filters: {
				quote_type: frm.doc.quote_type || "Testing",
			},
		}));
	},

	refresh(frm) {
		toggle_quote_type(frm);
		if (!frm.is_new() && frm.doc.lead) {
			frm.add_custom_button(__("Customer History"), () => {
				instacertify_crm.show_customer_history({ lead: frm.doc.lead });
			});
		}
		if (!frm.is_new() && frm.doc.public_url) {
			frm.add_custom_button(__("Copy Customer Link"), () => {
				instacertify_crm.copy_text(frm.doc.public_url);
			});
		}
		if (!frm.is_new() && ["Draft", "Revision Requested"].includes(frm.doc.status)) {
			frm
				.add_custom_button(__("Share / Reshare Quote"), () => {
					frappe.call({
						method: "instacertify_crm.api.share_quote",
						args: { name: frm.doc.name },
						freeze: true,
						callback(r) {
							frm.reload_doc();
							if (r.message?.public_url) {
								frappe.msgprint({
									title: __("Quote shared"),
									message: __("Customer link: {0}", [r.message.public_url]),
									indicator: "green",
								});
							}
						},
					});
				})
				.addClass("btn-primary");
		}
		if (frm.doc.status === "Accepted") {
			frm
				.add_custom_button(__("Select Documents & Share"), () => {
					instacertify_crm.create_document_request_dialog(frm.doc);
				})
				.addClass("btn-primary");
			frm.add_custom_button(__("Upload Final Report"), () => {
				frappe.new_doc("IC Report", {
					quote: frm.doc.name,
					title: __("Final report — {0}", [frm.doc.name]),
					message: __("Your report for quote {0} is ready to download.", [frm.doc.name]),
				});
			});
		}
	},

	quote_type(frm) {
		toggle_quote_type(frm);
		frm.set_value("template", "");
		frm.set_query("template", () => ({
			filters: { quote_type: frm.doc.quote_type || "Testing" },
		}));
	},

	template(frm) {
		if (!frm.doc.template) return;
		frappe.db.get_doc("IC Quote Template", frm.doc.template).then((t) => {
			const values = {
				quote_type: t.quote_type || frm.doc.quote_type,
				subject: t.subject,
				service: t.service,
				about_html: t.about_html,
				standards_html: t.standards_html,
				accreditation_html: t.accreditation_html,
				sample_requirements_html: t.sample_requirements_html,
				deliverables_html: t.deliverables_html,
				timeline_html: t.timeline_html,
				payment_terms_html: t.payment_terms_html,
				sample_handling_html: t.sample_handling_html,
				policies_html: t.policies_html,
				body_html: t.body_html,
				consulting_price: t.consulting_price,
				testing_price: t.testing_price,
				other_commercials: t.other_commercials,
				other_commercials_note: t.other_commercials_note,
				bank_detail: t.bank_detail,
			};
			if (t.subject && !frm.doc.description) {
				values.description = t.subject;
			}
			frm.set_value(values);
			if (t.validity_days && !frm.doc.validity_date) {
				frm.set_value(
					"validity_date",
					frappe.datetime.add_days(frappe.datetime.get_today(), t.validity_days),
				);
			}
		});
	},

	bank_detail(frm) {
		if (!frm.doc.bank_detail) return;
		frappe.db.get_doc("IC Bank Detail", frm.doc.bank_detail).then((b) => {
			const lines = [
				`Beneficiary Name: ${b.account_name}`,
				`Bank Name: ${b.bank_name}`,
				`Account Number: ${b.account_number}`,
				`IFSC Code: ${b.ifsc}`,
			];
			if (b.swift) lines.push(`SWIFT Code: ${b.swift}`);
			if (b.gstin) lines.push(`GSTIN: ${b.gstin}`);
			if (b.branch) lines.push(`Branch Address: ${b.branch}`);
			if (b.upi) lines.push(`UPI: ${b.upi}`);
			if (b.notes) lines.push(`Note: ${b.notes}`);
			frm.set_value("bank_snapshot", lines.join("\n"));
		});
	},
});

frappe.ui.form.on("IC Quote Testing Item", {
	testing_service(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (!row.testing_service) return;
		frappe.db.get_doc("IC Testing Service", row.testing_service).then((t) => {
			frappe.model.set_value(cdt, cdn, {
				test_name: t.test_name,
				lab_name: t.lab_name,
				per_unit_charges: t.selling_price,
				units: row.units || 1,
				selling_price: (row.units || 1) * flt(t.selling_price),
			});
			recalc_testing(frm);
		});
	},
	units(frm, cdt, cdn) {
		recalc_row(cdt, cdn);
		recalc_testing(frm);
	},
	per_unit_charges(frm, cdt, cdn) {
		recalc_row(cdt, cdn);
		recalc_testing(frm);
	},
	selling_price(frm) {
		recalc_testing(frm);
	},
	testing_items_remove(frm) {
		recalc_testing(frm);
	},
});

function recalc_row(cdt, cdn) {
	const row = locals[cdt][cdn];
	const units = flt(row.units) || 1;
	if (flt(row.per_unit_charges)) {
		frappe.model.set_value(cdt, cdn, "selling_price", units * flt(row.per_unit_charges));
	}
}

function recalc_testing(frm) {
	const total = (frm.doc.testing_items || []).reduce(
		(sum, row) => sum + flt(row.selling_price),
		0,
	);
	frm.set_value("testing_price", total);
}

function toggle_quote_type(frm) {
	const testing = frm.doc.quote_type === "Testing";
	frm.toggle_display("testing_items", testing);
	frm.toggle_display("section_testing", testing);
	frm.toggle_display("consulting_price", !testing);
	frm.toggle_display("accreditation_html", !testing);
}
