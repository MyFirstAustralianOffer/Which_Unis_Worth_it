/**
 * EXAMPLE database cards for DEMO MODE only (when Google Sheets isn't
 * connected). Every one is made up and is labelled "Example" on screen.
 * Once SHEETS_API_URL is set in js/config.js, real entries replace these.
 */
const e = (study_level, course_name, university, graduation_year, student_type, time_to_first_job, first_role, starting_salary, current_role, current_salary) =>
  ({ study_level, course_name, university, graduation_year, student_type, time_to_first_job, first_role, starting_salary, current_role, current_salary, example: true });

export const SAMPLE_ENTRIES = [
  e("Bachelor", "Nursing", "UNSW Sydney", "2021", "Domestic", "Under 3 months", "Graduate Nurse", 72000, "Registered Nurse", 88000),
  e("Master", "Data Science", "Monash University", "2022", "International", "3–6 months", "Junior Data Analyst", 68000, "Data Analyst", 85000),
  e("Bachelor", "Civil Engineering", "UTS", "2020", "Domestic", "Before graduating", "Graduate Engineer", 75000, "Project Engineer", 105000),
  e("Bachelor", "Commerce (Finance)", "Macquarie University", "2022", "International", "6–12 months", "Customer Service Officer", 55000, "Financial Analyst", 82000),
  e("Bachelor", "Laws", "University of Sydney", "2019", "Domestic", "3–6 months", "Paralegal", 62000, "Associate", 110000),
  e("Bachelor", "Psychology", "Deakin University", "2021", "International", "Over 12 months", "Support Worker", 52000, "Intake Coordinator", 68000),
  e("Bachelor", "Education (Primary)", "Flinders University", "2023", "Domestic", "Before graduating", "Graduate Teacher", 76000, "Classroom Teacher", 84000),
  e("Bachelor", "Computer Science", "University of Adelaide", "2022", "Domestic", "3–6 months", "Graduate Software Engineer", 78000, "Software Engineer", 102000),
  e("Master", "Information Technology", "University of South Australia", "2023", "International", "6–12 months", "IT Support Analyst", 60000, "Systems Analyst", 80000),
  e("Bachelor", "Pharmacy", "Monash University", "2020", "Domestic", "Before graduating", "Intern Pharmacist", 58000, "Pharmacist", 92000),
  e("Bachelor", "Marketing", "RMIT University", "2022", "Domestic", "6–12 months", "Marketing Coordinator", 60000, "Digital Marketing Specialist", 75000),
  e("Bachelor", "Mechanical Engineering", "University of Queensland", "2021", "Domestic", "Under 3 months", "Graduate Mechanical Engineer", 80000, "Mechanical Engineer", 98000),
  e("Bachelor", "Accounting", "Curtin University", "2023", "International", "Over 12 months", "Accounts Assistant", 55000, "Assistant Accountant", 65000),
  e("Bachelor", "Social Work", "Griffith University", "2020", "Domestic", "Under 3 months", "Case Worker", 70000, "Senior Social Worker", 95000),
  e("Master", "Architecture", "University of Melbourne", "2019", "Domestic", "6–12 months", "Graduate of Architecture", 62000, "Architect", 98000),
  e("Bachelor", "Biomedical Science", "Western Sydney University", "2022", "Domestic", "Still looking", "Laboratory Assistant", 54000, "Laboratory Technician", 61000),
  e("Diploma", "Nursing", "Federation University", "2023", "Domestic", "Under 3 months", "Enrolled Nurse", 62000, "Enrolled Nurse", 66000),
  e("Master", "Business Administration", "Bond University", "2021", "International", "3–6 months", "Business Analyst", 85000, "Product Manager", 135000),
  e("Bachelor", "Law", "QUT", "2022", "Domestic", "6–12 months", "Graduate Lawyer", 72000, "Lawyer", 90000),
  e("Graduate Diploma", "Secondary Teaching", "Charles Sturt University", "2024", "Domestic", "Before graduating", "Graduate Teacher", 77000, "Graduate Teacher", 79000),
  e("Bachelor", "Physiotherapy", "La Trobe University", "2021", "Domestic", "Under 3 months", "Graduate Physiotherapist", 70000, "Physiotherapist", 90000),
  e("PhD", "Chemistry", "Australian National University", "2020", "International", "6–12 months", "Postdoctoral Researcher", 95000, "Research Scientist", 120000),
  e("Bachelor", "Information Technology", "Swinburne University of Technology", "2023", "International", "Over 12 months", "Help Desk Officer", 56000, "Junior Developer", 70000),
  e("Bachelor", "Media and Communication", "University of Wollongong", "2022", "Domestic", "6–12 months", "Content Producer", 58000, "Communications Advisor", 76000),
];
