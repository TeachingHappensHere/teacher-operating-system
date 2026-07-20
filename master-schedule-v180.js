(() => {
  "use strict";

  const FULL_DAY = [
    ["8:00", "8:15", "Breakfast / Phonemic Awareness Auditory Drill / New Concepts", "breakfast"],
    ["8:15", "8:20", "Heggerty Phonemic Awareness", "heggerty"],
    ["8:20", "9:15", "MOWR / Tier II Reading Intervention", "mowr"],
    ["9:15", "10:45", "Tier I Core Reading — Open Court / UFLI / Heggerty", "reading"],
    ["10:45", "11:10", "Lunch / Recess", "lunchRecess"],
    ["11:10", "11:40", "Writing — Open Court / Grammar / Interactive Writing", "writing"],
    ["11:40", "12:40", "Math — Eureka Math²", "math"],
    ["12:40", "1:10", "Workout", "workout"],
    ["1:10", "1:20", "Recess / Snack", "recess"],
    ["1:20", "1:40", "Math Fluency / Intervention / Practice", "math2"],
    ["1:40", "2:15", "Science", "science"],
    ["2:15", "2:55", "Social Studies", "socialStudies"],
    ["2:55", "3:00", "Pack-Up / Clean-Up", "packup"],
    ["3:00", "3:30", "Dismissal", "dismissal"]
  ];

  const HALF_DAY = [
    ["8:00", "8:30", "Breakfast / Bellwork / Phonemic Awareness Auditory Drill", "breakfast"],
    ["8:30", "10:30", "ELA Assessments — Open Court / Core Phonics / Fluency / Vocabulary", "elaAssessments"],
    ["10:30", "10:50", "Lunch", "lunch"],
    ["10:50", "11:10", "Transition / Recess", "transition"],
    ["11:10", "12:00", "Science / Social Studies — Vocabulary and Assessments", "scienceSocialStudies"],
    ["12:00", "12:30", "Dismissal", "dismissal"]
  ];

  const SIMPLE_FULL_DAY = FULL_DAY.map(([start, end, title]) => [`${start}–${end}`, title]);
  const SIMPLE_HALF_DAY = HALF_DAY.map(([start, end, title]) => [`${start}–${end}`, title]);

  const MASTER = Object.freeze({
    version: "18.0.0",
    effectiveSchoolYear: "2026–2027",
    fullDaySchedule2026_2027: FULL_DAY,
    halfDaySchedule2026_2027: HALF_DAY,
    schedule: SIMPLE_FULL_DAY,
    scheduleModeRules: {
      defaultWeekdays: {
        Monday: "full",
        Tuesday: "full",
        Wednesday: "full",
        Thursday: "full",
        Friday: "half"
      },
      manualOverride: true
    }
  });

  window.THH_MASTER_SCHEDULE = MASTER;

  function applySchedule(data) {
    if (!data || typeof data !== "object") return data;
    return {
      ...data,
      version: data.version ? `${data.version} + Master Schedule 18.0` : "Master Schedule 18.0",
      schedule: MASTER.schedule,
      fullDaySchedule2026_2027: MASTER.fullDaySchedule2026_2027,
      halfDaySchedule2026_2027: MASTER.halfDaySchedule2026_2027,
      scheduleModeRules: MASTER.scheduleModeRules
    };
  }

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const response = await nativeFetch(...args);
    const requestUrl = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
    const pathname = new URL(requestUrl, location.href).pathname;

    if (!pathname.endsWith("/tos-data.json") && pathname !== "/tos-data.json") {
      return response;
    }

    try {
      const data = await response.clone().json();
      const patched = applySchedule(data);
      const headers = new Headers(response.headers);
      headers.set("content-type", "application/json; charset=utf-8");
      headers.set("x-teacher-os-schedule", MASTER.version);
      return new Response(JSON.stringify(patched), {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    } catch (error) {
      console.error("Master Schedule 18.0 could not patch tos-data.json", error);
      return response;
    }
  };
})();
