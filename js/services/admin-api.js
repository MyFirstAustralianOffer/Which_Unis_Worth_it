/**
 * Admin page data (admin.html). Every call is checked by the database itself
 * (see supabase/admin.sql): anyone who isn't on the admins list gets "Not found".
 */
import { rpc } from "./api.js?v=e6bfab92";

export const overview = () => rpc("admin_overview");
export const entries = ({ form = "graduates", search = "", filter = "all", limit = 50, offset = 0 } = {}) =>
  rpc("admin_entries", { p_form: form, p_search: search || null, p_filter: filter, p_limit: limit, p_offset: offset });
export const entry = (form, id) => rpc("admin_entry", { p_form: form, p_id: id });
export const updateEntry = (form, id, changes) => rpc("admin_update_entry", { p_form: form, p_id: id, p_changes: changes });
export const setVisible = (ids, show) => rpc("admin_set_visible", { p_ids: ids, p_show: show });
export const markReviewed = (ids) => rpc("admin_mark_reviewed", { p_ids: ids });
export const deleteEntries = (form, ids) => rpc("admin_delete_entries", { p_form: form, p_ids: ids, p_reason: "deleted by admin" });
export const deleted = () => rpc("admin_deleted");
export const restore = (id) => rpc("admin_restore", { p_deleted_id: id });
export const users = ({ search = "", filter = "all", limit = 50, offset = 0 } = {}) =>
  rpc("admin_users", { p_search: search || null, p_filter: filter, p_limit: limit, p_offset: offset });
export const deleteUser = (id) => rpc("admin_delete_user", { p_user_id: id });
export const cleanupLists = () => rpc("admin_cleanup_lists");
export const assignUniversity = (values, university) => rpc("admin_assign_university", { p_values: values, p_university: university });
export const renameCourse = (values, name) => rpc("admin_rename_course", { p_values: values, p_new_name: name });
export const activity = (limit = 150) => rpc("admin_activity", { p_limit: limit });
