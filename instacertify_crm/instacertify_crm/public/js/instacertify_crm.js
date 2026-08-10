// Instacertify CRM desk helpers for ERPNext 16
frappe.provide("instacertify_crm");

instacertify_crm.copy_text = async function (text) {
	await navigator.clipboard.writeText(text);
	frappe.show_alert({ message: __("Copied"), indicator: "green" });
};
