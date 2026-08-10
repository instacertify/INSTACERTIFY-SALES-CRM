// Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
// For license information, please see license.txt

frappe.ui.form.on("IC Quote", {
	refresh(frm) {
		if (!frm.is_new() && frm.doc.public_url) {
			frm.add_custom_button(__("Copy Customer Link"), () => {
				instacertify_crm.copy_text(frm.doc.public_url);
			});
		}
		if (!frm.is_new() && ["Draft", "Revision Requested"].includes(frm.doc.status)) {
			frm.add_custom_button(__("Share / Reshare Quote"), () => {
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
			}).addClass("btn-primary");
		}
		if (frm.doc.status === "Accepted") {
			frm.add_custom_button(__("Create Document Request"), () => {
				frappe.new_doc("IC Document Request", {
					quote: frm.doc.name,
					service: frm.doc.service,
				});
			});
			frm.add_custom_button(__("Upload Final Report"), () => {
				frappe.new_doc("IC Report", {
					quote: frm.doc.name,
					title: __("Final report — {0}", [frm.doc.name]),
					message: __("Your report for quote {0} is ready to download.", [frm.doc.name]),
				});
			});
		}
	},

	template(frm) {
		if (!frm.doc.template) return;
		frappe.db.get_doc("IC Quote Template", frm.doc.template).then((t) => {
			frm.set_value({
				service: t.service,
				body_html: t.body_html,
				consulting_price: t.consulting_price,
				testing_price: t.testing_price,
				other_commercials: t.other_commercials,
				other_commercials_note: t.other_commercials_note,
				bank_detail: t.bank_detail,
			});
		});
	},

	bank_detail(frm) {
		if (!frm.doc.bank_detail) return;
		frappe.db.get_doc("IC Bank Detail", frm.doc.bank_detail).then((b) => {
			const lines = [
				`Account Name: ${b.account_name}`,
				`Bank: ${b.bank_name}`,
				`Account Number: ${b.account_number}`,
				`IFSC: ${b.ifsc}`,
			];
			if (b.branch) lines.push(`Branch: ${b.branch}`);
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
			// Only selling price is pulled into the quote — never purchase price
			frappe.model.set_value(cdt, cdn, {
				test_name: t.test_name,
				lab_name: t.lab_name,
				selling_price: t.selling_price,
			});
		});
	},
	selling_price(frm) {
		recalc_testing(frm);
	},
	testing_items_remove(frm) {
		recalc_testing(frm);
	},
});

function recalc_testing(frm) {
	const total = (frm.doc.testing_items || []).reduce(
		(sum, row) => sum + flt(row.selling_price),
		0,
	);
	frm.set_value("testing_price", total);
}
