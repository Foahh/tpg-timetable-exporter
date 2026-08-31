import { join } from "node:path";
import { getSession } from "./auth";
import { OUT_DIR, ensureDir } from "./config";
import { toIcs } from "./ics";
import { enrichMissingTimetables, fetchCurrentTerm, fetchOfferings, fetchStudent } from "./portal";
import { parseTerm, semesterLabel } from "./term";
import { classesForTerm, enrolledClassesFromStudent, eventsFromClasses } from "./timetable";
import type { TermRef, TimetableEvent } from "./types";

type Command = "dump" | "export" | "login";

async function main() {
  const { command, termFlag, offerings } = parseArgs(Bun.argv.slice(2));
  if (!command) {
    printUsage();
    process.exit(1);
  }

  const session = await getSession();
  if (command === "login") {
    console.log(`Logged in as ${session.profile.email} (${session.profile.uid})`);
    return;
  }

  const term = termFlag ?? (await fetchCurrentTerm());
  const student = await fetchStudent(session.accessToken, session.profile.uid);
  const enrolled = enrolledClassesFromStudent(student);
  const termClasses = classesForTerm(enrolled, term);
  await enrichMissingTimetables(session.accessToken, student, termClasses);
  const events = eventsFromClasses(termClasses);

  if (command === "dump") {
    await dump({
      term,
      sessionEmail: session.profile.email,
      student,
      enrolled,
      termClasses,
      events,
      offerings: offerings ? await fetchOfferings(session.accessToken, student.id) : undefined,
    });
    return;
  }

  await exportTimetable(term, events);
}

function parseArgs(argv: string[]): {
  command: Command | null;
  termFlag?: TermRef;
  offerings: boolean;
} {
  const [command, ...rest] = argv;
  if (command === "--help" || command === "-h") {
    printUsage();
    process.exit(0);
  }
  if (command !== "dump" && command !== "export" && command !== "login") {
    return { command: null, offerings: false };
  }

  let termFlag: TermRef | undefined;
  let offerings = false;
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === "--term") {
      const value = rest[++i];
      if (!value) throw new Error("--term requires a value such as 2026-1");
      termFlag = parseTerm(value);
    } else if (arg === "--offerings") {
      offerings = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return { command, termFlag, offerings };
}

function printUsage() {
  console.log(`CDS TPG timetable exporter

Usage:
  bun run login
  bun run dump [--term 2026-1] [--offerings]
  bun run export [--term 2026-1]

Credentials (Bun loads .env automatically):
  TPG_EMAIL / TPG_PASSWORD
  or TPG_ACCESS_TOKEN (localStorage key accessToken)

The login API rate-limits to 5 attempts per minute. A session is cached in .auth/.`);
}

async function dump(input: {
  term: TermRef;
  sessionEmail: string;
  student: Awaited<ReturnType<typeof fetchStudent>>;
  enrolled: ReturnType<typeof enrolledClassesFromStudent>;
  termClasses: ReturnType<typeof classesForTerm>;
  events: TimetableEvent[];
  offerings?: Awaited<ReturnType<typeof fetchOfferings>>;
}) {
  const dir = join(OUT_DIR, "dump");
  await ensureDir(dir);

  const files = {
    "term.json": input.term,
    "student.json": input.student,
    "enrolled-classes.json": input.enrolled,
    "term-classes.json": input.termClasses,
    "events.json": serializeEvents(input.events),
  };

  for (const [name, value] of Object.entries(files)) {
    await Bun.write(join(dir, name), JSON.stringify(value, null, 2));
  }
  if (input.offerings) {
    await Bun.write(join(dir, "offerings.json"), JSON.stringify(input.offerings, null, 2));
  }

  console.log(`Logged in as ${input.sessionEmail}`);
  console.log(`Term ${input.term.key} (${semesterLabel(input.term.semester)})`);
  console.log(`Study period id: ${input.student.id}`);
  console.log(`Enrolled classes (all terms): ${input.enrolled.length}`);
  console.log(`Classes in ${input.term.key}: ${input.termClasses.length}`);
  console.log(`Timetable events: ${input.events.length}`);
  if (input.enrolled.length > 0 && input.termClasses.length === 0) {
    console.log(
      "No classes matched this term. Check enrolled-classes.json for academic_year/semester fields.",
    );
  }
  console.log(`Wrote JSON dumps to ${dir}`);
}

async function exportTimetable(term: TermRef, events: TimetableEvent[]) {
  await ensureDir(OUT_DIR);
  const stem = `timetable-${term.key}`;
  const icsPath = join(OUT_DIR, `${stem}.ics`);
  const jsonPath = join(OUT_DIR, `${stem}.json`);

  await Bun.write(icsPath, toIcs(events, `TPG ${term.key}`));
  await Bun.write(jsonPath, JSON.stringify(serializeEvents(events), null, 2));

  console.log(`Term ${term.key}: ${events.length} events`);
  console.log(`ICS  ${icsPath}`);
  console.log(`JSON ${jsonPath}`);
}

function serializeEvents(events: TimetableEvent[]) {
  return events.map((event) => ({
    ...event,
    start: event.start.toISO(),
    end: event.end.toISO(),
  }));
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}
