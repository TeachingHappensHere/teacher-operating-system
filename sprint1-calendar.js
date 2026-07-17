(() => {
  "use strict";
  let config = null;
  const iso = value => {
    if (!value) return new Date().toISOString().slice(0, 10);
    const date = value instanceof Date ? value : new Date(`${value}T12:00:00`);
    return Number.isNaN(date.valueOf()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
  };
  async function load() {
    if (config) return config;
    const response = await fetch("sprint1-config.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Sprint 1 calendar configuration did not load.");
    config = await response.json();
    return config;
  }
  function classify(dateValue) {
    if (!config) throw new Error("Calendar engine is not ready.");
    const date = iso(dateValue);
    const { classroomLaunchStart, classroomLaunchEnd, coreInstructionStart } = config.dates;
    if (date < classroomLaunchStart) return "prelaunch";
    if (date <= classroomLaunchEnd) return "classroom-launch";
    if (date < coreInstructionStart) return "transition";
    return "core-instruction";
  }
  function details(dateValue) {
    const date = iso(dateValue);
    const mode = classify(date);
    return {
      date,
      mode,
      label: mode === "prelaunch" ? "Pre-Launch Preparation" : mode === "classroom-launch" ? (config.launchDays[date] || "Classroom Launch") : mode === "transition" ? "Launch Transition" : "Core Instruction",
      launchDay: mode === "classroom-launch" ? Number(date.slice(-2)) - 26 : null,
      isIDay: date === config.dates.firstIDay
    };
  }
  window.TOSCalendar = Object.freeze({ load, classify, details, iso, getConfig: () => config });
})();
