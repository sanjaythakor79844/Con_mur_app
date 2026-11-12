/**
 * LivLearn.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * React port of the "management additions" from the Liv vanilla-JS prototype.
 * Covers five sheet-layer screens:
 *
 *   • Learn hub       — topic list + plain-names table
 *   • Learn topic     — per-topic explainer (lt:age, lt:aiws, etc.)
 *   • Therapy glossary — per-therapy plain-language description
 *   • Pod education   — what a Pod session is
 *   • Centre finder   — static centre listing + geolocation
 *
 * Design conventions:
 *   - All class names (`.scroll`, `.card`, `.hd`, `.k`, `.h2`, `.sub`,
 *     `.btn`, `.btn.ghost`, `.opt`, `.pill`) are from the existing
 *     `styles.css` Liv monochrome system — no new CSS classes.
 *   - `handleAction(str)` from liv.tsx drives every navigation tap.
 *   - Components are pure presentational; all state lives in liv.tsx.
 *   - `hasReport` / `src` props gate which journey-conditional CTAs render.
 *
 * Production note (from the original prototype):
 *   General information, not medical advice. Wording is pending physician
 *   sign-off. Every figure must come from the real API in production.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { LivIcon, type LivIconName } from "@/components/liv";

// ─── Types ───────────────────────────────────────────────────────────────────

type JourneySrc = "none" | "upload" | "kiosk";

interface LearnSharedProps {
  handleAction: (a: string) => void;
  /** Which journey variant the member is in */
  src: JourneySrc;
  /** Whether any report (kiosk or upload) has been loaded */
  hasReport: boolean;
  /** Current value of the VO₂max marker, if recorded */
  vo2Value?: string | number | null;
}

// ─── Learn topic data ─────────────────────────────────────────────────────────

interface LearnTopic {
  id: string;
  title: string;
  tech: string;
  icon: LivIconName;
  sections: [string, string][];
}

const LEARN_TOPICS: LearnTopic[] = [
  {
    id: "age",
    title: "Your body's health age estimate",
    tech: "Biological age",
    icon: "user",
    sections: [
      ["What it is", "An estimate of how your body's health markers compare with what is typical at different ages."],
      ["Versus your calendar age", "Calendar age counts birthdays. The estimate can sit above or below it, and it can change as your results change."],
      ["How Liv works it out", "Liv combines your age with a set of blood biomarkers. The result carries a margin of about two years, so read it as a range, not an exact number."],
      ["Why it matters", "It turns many results into one number you can follow over time, to see whether changes you make move it."],
      ["What a result means", "A number above your calendar age points to areas worth discussing with your doctor. It is not a diagnosis."],
    ],
  },
  {
    id: "aiws",
    title: "Your whole-body score",
    tech: "AIWS score",
    icon: "spark",
    sections: [
      ["What it is", "The Active Integrated Wellness Score combines blood, body, heart, sleep and lifestyle into one number out of 100."],
      ["How it is built", "Eight body systems are each scored, then combined. Liv holds you to longevity-optimal ranges, which are stricter than standard lab ranges."],
      ["Limits", "It is a snapshot of one moment. It changes when you re-test, and it is not a diagnosis. Your doctor reads it alongside everything else."],
    ],
  },
  {
    id: "markers",
    title: "Health signals in your blood",
    tech: "Biomarkers",
    icon: "drop",
    sections: [
      ["What they are", "Biomarkers are measurements in a blood sample, such as blood sugar, cholesterol, iron and vitamin D."],
      ["Two kinds of range", "Clinical ranges show where illness begins. Longevity-optimal ranges show where long-term health is built. Liv shows both."],
      ["How to read yours", "Open any result to see your value, its unit, the range and what it may mean. Results are information, not a diagnosis."],
    ],
  },
  {
    id: "vo2",
    title: "Oxygen fitness indicator",
    tech: "VO₂max",
    icon: "flame",
    sections: [
      ["What it is", "The most oxygen your body can use during hard exercise, in millilitres per kilogram per minute."],
      ["Why it matters", "It is widely used as a measure of cardiovascular fitness, and it tends to be tracked over time rather than judged once."],
      ["Limits", "It depends on how it is measured or estimated, so compare like with like."],
    ],
  },
  {
    id: "organ",
    title: "Organ age",
    tech: "Not available yet",
    icon: "shield",
    sections: [
      ["Status", "Liv does not show an organ age. No validated calculation or backend data has been confirmed, so no value is shown."],
    ],
  },
  {
    id: "pod",
    title: "What happens in a Pod session",
    tech: "Pod session",
    icon: "cal",
    sections: [
      ["The idea", "One screening reads your blood, heart and body in a single visit at a Living Lab centre."],
      ["What you get", "A physician reviews and signs your Longevity Report, which then arrives in Liv."],
      ["Re-measuring", "Later visits repeat key measures, such as grip, body composition and vitals, so you can see change."],
    ],
  },
  {
    id: "longevity",
    title: "Preventive health, in plain words",
    tech: "Longevity",
    icon: "plan",
    sections: [
      ["The approach", "Measure, act, re-measure. Small, steady changes, checked against your own results."],
      ["Normal is not the same as optimal", "A result can be inside the clinical range and still have room to improve. That is the early window Liv looks at."],
      ["Your doctor stays in charge", "Liv explains and tracks. Treatment decisions belong to you and your physician."],
    ],
  },
];

const TOPIC_ORDER = ["age", "aiws", "markers", "vo2", "organ", "pod", "longevity"];

// ─── Therapy glossary data ────────────────────────────────────────────────────

interface Therapy {
  id: string;
  name: string;
  tech: string;
  sections: string[];
  ctaLabel: string;
  ctaAction: string;
}

const SECTION_LABELS = [
  "What is it?",
  "How does it work?",
  "Why is it used?",
  "Potential benefits",
  "Safety and limitations",
  "Related Pod and service information",
];

const THERAPIES_DATA: Therapy[] = [
  {
    id: "pbm",
    name: "Photobiomodulation",
    tech: "Red and near-infrared light",
    sections: [
      "Red and near-infrared light shone on the skin for a set time.",
      "Cells can absorb this light. Researchers are still working out exactly how it changes cell activity, so this is simplified.",
      "Offered for skin and as a recovery session after training.",
      "Some people use it for skin appearance and recovery. Evidence is still emerging and results vary.",
      "Eyes are protected. Tell the team about light-sensitive conditions or medicines, pregnancy, or active skin problems. It does not treat medical conditions.",
      "The red-light face mask is a 20-minute session in Care.",
    ],
    ctaLabel: "See the red-light face mask",
    ctaAction: "sheet:svc:mask",
  },
  {
    id: "sauna",
    name: "Infrared sauna",
    tech: "Heat therapy",
    sections: [
      "A sauna that warms the body with infrared heat, not only hot air.",
      "Your skin and body temperature rise, you sweat, and your heart rate goes up a little, like light exercise.",
      "Offered for relaxation and recovery. Plans in the prototype use about 20 minutes at 55 to 60°C.",
      "Many people find it relaxing. Some studies link regular heat exposure with heart and metabolic markers, but findings vary. It does not replace exercise.",
      "Heat is not right for everyone. Tell the team about heart or blood pressure conditions or pregnancy. Drink water and stop if you feel dizzy.",
      "Booked as a therapy session at the centre.",
    ],
    ctaLabel: "Book a therapy session",
    ctaAction: "newbook:ther",
  },
  {
    id: "hbot",
    name: "Hyperbaric oxygen",
    tech: "HBOT",
    sections: [
      "Breathing oxygen inside a chamber where the air pressure is higher than normal.",
      "Higher pressure lets more oxygen dissolve in the blood.",
      "Medicine uses it for specific conditions. Liv offers an introductory block after a safety screen.",
      "Benefits for general wellness are not firmly established and are still being studied.",
      "A safety screen comes first. Ear and sinus discomfort is common. Tell the team about lung conditions, recent ear or chest surgery, or pregnancy.",
      "The prototype's Inflammation journey lists ten 60-minute sessions after screening.",
    ],
    ctaLabel: "Book a therapy session",
    ctaAction: "newbook:ther",
  },
  {
    id: "drip",
    name: "IV drips",
    tech: "Intravenous nutrient therapy",
    sections: [
      "Fluids with vitamins, minerals or amino acids given straight into a vein.",
      "Nutrients bypass the gut and enter the blood directly.",
      "Offered when a physician decides it suits your results.",
      "It can help people who cannot take supplements by mouth. Whether it adds anything over tablets or food depends on the person.",
      "A short screening comes first: allergies, pregnancy or breastfeeding, and kidney, liver or heart conditions. Drips are given only against your labs, with doctor sign-off.",
      "Six drips are listed in Care, from Ultimate Glow to Metabolic and Hormonal Health.",
    ],
    ctaLabel: "See IV drips",
    ctaAction: "sheet:svc:iv1",
  },
  {
    id: "comp",
    name: "Lymphatic compression",
    tech: "Normatec chamber",
    sections: [
      "Inflatable sleeves around the legs or arms that squeeze in a sequence.",
      "The squeezing pattern is designed to encourage fluid and blood to move back toward the heart.",
      "Used as a recovery session alongside training.",
      "People often report lighter legs afterwards. Evidence for recovery is limited, so think of it as comfort, not a cure.",
      "Tell the team about blood clots, severe swelling, skin infection or circulation conditions first.",
      "Listed in the prototype's treatment journey.",
    ],
    ctaLabel: "Book a therapy session",
    ctaAction: "newbook:ther",
  },
  {
    id: "hf",
    name: "HydraFacial",
    tech: "Skin treatment",
    sections: [
      "A three-step facial: cleanse, extract and hydrate.",
      "A device exfoliates, draws out congestion and applies hydrating serums.",
      "Skin care for congestion and dullness.",
      "Smoother, hydrated-looking skin for some people. Effects are cosmetic and temporary.",
      "Tell the team about active acne, eczema or open wounds, or recent retinoids or peels.",
      "Packs are available in Care.",
    ],
    ctaLabel: "See HydraFacial",
    ctaAction: "sheet:svc:hf",
  },
];

// ─── Centre data (static — production needs a live directory endpoint) ────────

interface Centre {
  name: string;
  address: string;
  hours: string;
  services: string[];
}

const CENTRES: Centre[] = [
  {
    name: "Aaroogya AI Centre for Women's Wellness",
    address: "Aundh, Pune",
    hours: "Open 8 AM to 8 PM",
    services: ["Pod screening", "Skin, hair and IV drip treatments", "Recovery therapies"],
  },
];

// ─── Plain-name reference table ──────────────────────────────────────────────

const PLAIN_NAMES: [string, string][] = [
  ["Biological age", "Your body's health age estimate"],
  ["HRV", "Heart recovery and adaptability"],
  ["VO₂max", "Oxygen fitness indicator"],
  ["Biomarkers", "Health signals in your blood"],
];

// ─── Small shared helpers ────────────────────────────────────────────────────

function BackButton({
  action,
  label,
  handleAction,
}: {
  action: string;
  label: string;
  handleAction: (a: string) => void;
}) {
  return (
    <div className="hd">
      <button
        type="button"
        className="icb"
        onClick={() => handleAction(action)}
        aria-label="Back"
      >
        <LivIcon name="back" size={20} />
      </button>
      <span className="k">{label}</span>
      <span style={{ width: 44 }} />
    </div>
  );
}

function SectionCard({ label, text }: { label: string; text: string }) {
  return (
    <div className="card" style={{ gap: 6 }}>
      <span className="k">{label}</span>
      <p style={{ margin: 0, fontSize: "14.5px", lineHeight: 1.5 }}>{text}</p>
    </div>
  );
}

function VideoPlaceholder({ title }: { title: string }) {
  return (
    <div
      className="card empty"
      style={{
        alignItems: "center",
        textAlign: "center",
        gap: 8,
        padding: "22px 18px",
        borderStyle: "dashed",
      }}
    >
      <LivIcon name="play" size={26} />
      <span className="h3">{title}</span>
      <span className="sub">Short video placeholder. Not recorded yet.</span>
    </div>
  );
}

function OptRow({
  icon,
  title,
  subtitle,
  action,
  pill,
  handleAction,
}: {
  icon: LivIconName;
  title: string;
  subtitle: string;
  action: string;
  pill?: string;
  handleAction: (a: string) => void;
}) {
  return (
    <button
      type="button"
      className="opt"
      onClick={() => handleAction(action)}
    >
      <LivIcon name={icon} size={22} />
      <div>
        <div className="h3">{title}</div>
        <div className="sub">{subtitle}</div>
      </div>
      {pill ? (
        <span className="pill o">{pill}</span>
      ) : (
        <LivIcon name="chev" size={18} />
      )}
    </button>
  );
}

const DISC = (
  <p className="sub" style={{ fontSize: 12 }}>
    General information, not medical advice. Wording is pending physician sign-off.
  </p>
);

// ─── LivLearnHub ─────────────────────────────────────────────────────────────

export function LivLearnHub({ handleAction }: Pick<LearnSharedProps, "handleAction">) {
  return (
    <div className="scroll">
      <div>
        <span className="k">Learn</span>
        <h2 className="h2" style={{ marginTop: 8 }}>Understand your numbers</h2>
        <p className="sub" style={{ marginTop: 6 }}>
          Short explainers in plain language. The technical name is always shown too.
        </p>
      </div>

      {TOPIC_ORDER.map((id) => {
        const t = LEARN_TOPICS.find((x) => x.id === id)!;
        return (
          <OptRow
            key={id}
            icon={t.icon}
            title={t.title}
            subtitle={t.tech}
            action={`sheet:lt:${id}`}
            pill={id === "organ" ? "Not available" : undefined}
            handleAction={handleAction}
          />
        );
      })}

      <OptRow
        icon="spark"
        title="Therapy glossary"
        subtitle="Photobiomodulation, sauna, drips and more"
        action="sheet:gloss"
        handleAction={handleAction}
      />

      {/* Plain-names reference card */}
      <div className="card" style={{ gap: 0, padding: "6px 18px" }}>
        <span className="k">Plain names</span>
        <table
          style={{ marginTop: 6, width: "100%", borderCollapse: "collapse" }}
          aria-label="Plain language names for health terms"
        >
          <tbody>
            {PLAIN_NAMES.map(([tech, plain]) => (
              <tr key={tech}>
                <td
                  style={{
                    padding: "5px 0",
                    fontSize: 13,
                    color: "var(--liv-muted)",
                    borderBottom: "1px solid var(--liv-line)",
                    paddingRight: 12,
                    whiteSpace: "nowrap",
                  }}
                >
                  {tech}
                </td>
                <td
                  style={{
                    padding: "5px 0",
                    fontSize: 13,
                    fontWeight: 500,
                    textAlign: "right",
                    borderBottom: "1px solid var(--liv-line)",
                    whiteSpace: "normal",
                  }}
                >
                  {plain}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ height: 24, flexShrink: 0 }} />
    </div>
  );
}

// ─── LivLearnTopic ────────────────────────────────────────────────────────────

export function LivLearnTopic({
  topicId,
  handleAction,
  src,
  hasReport,
  vo2Value,
}: { topicId: string } & LearnSharedProps) {
  const topic = LEARN_TOPICS.find((t) => t.id === topicId);
  if (!topic) return null;

  // Journey helper: 1 = no report, 2 = kiosk, 3 = upload
  const journey = !hasReport ? 1 : src === "kiosk" ? 2 : 3;

  // Per-topic CTA block
  let cta: React.ReactNode = null;
  if (topicId === "age") {
    cta =
      journey === 2 ? (
        <button type="button" className="btn" onClick={() => handleAction("sheet:age")}>
          See my result
        </button>
      ) : (
        <div className="card" style={{ gap: 6 }}>
          <span className="k">Your result</span>
          <p className="sub">
            Your estimate appears when the required results are available. Nothing is shown until then.
          </p>
        </div>
      );
  } else if (topicId === "aiws") {
    cta =
      journey === 2 ? (
        <button type="button" className="btn" onClick={() => handleAction("sheet:score")}>
          See my score
        </button>
      ) : (
        <div className="card" style={{ gap: 6 }}>
          <span className="k">Your score</span>
          <p className="sub">Your score appears once a Pod session report is available.</p>
        </div>
      );
  } else if (topicId === "vo2") {
    cta =
      journey === 2 && vo2Value != null ? (
        <div className="card inv" style={{ gap: 6 }}>
          <span className="k">Your result</span>
          <div>
            <span className="num" style={{ fontSize: 40 }}>
              {vo2Value}
            </span>{" "}
            <span className="unit">mL/kg/min</span>
          </div>
          <button type="button" className="btn" onClick={() => handleAction("marker:vo2")}>
            See details
          </button>
        </div>
      ) : (
        <div className="card" style={{ gap: 6 }}>
          <span className="k">Your result</span>
          <p className="sub">No measurement yet. It appears here once it has been measured.</p>
        </div>
      );
  } else if (topicId === "markers") {
    cta = hasReport ? (
      <button type="button" className="btn" onClick={() => handleAction("tab:markers")}>
        Open my results
      </button>
    ) : null;
  } else if (topicId === "pod") {
    cta = (
      <button type="button" className="btn" onClick={() => handleAction("sheet:pod")}>
        Pod sessions and centres
      </button>
    );
  }

  return (
    <div className="scroll">
      <BackButton
        action="sheet:learn"
        label={topic.tech}
        handleAction={handleAction}
      />
      <h2 className="h2">{topic.title}</h2>

      {/* No video for 'organ' (unavailable topic) */}
      {topicId !== "organ" && <VideoPlaceholder title={`Watch: ${topic.title}`} />}

      {topic.sections.map(([heading, body]) => (
        <SectionCard key={heading} label={heading} text={body} />
      ))}

      {cta}
      {DISC}
      <div style={{ height: 24, flexShrink: 0 }} />
    </div>
  );
}

// ─── LivGlossary ─────────────────────────────────────────────────────────────

export function LivGlossary({ handleAction }: Pick<LearnSharedProps, "handleAction">) {
  return (
    <div className="scroll">
      <BackButton action="sheet:learn" label="Therapy glossary" handleAction={handleAction} />
      <h2 className="h2">What each therapy is</h2>
      <p className="sub">Only therapies in the prototype's service list appear here.</p>

      {THERAPIES_DATA.map((t) => (
        <OptRow
          key={t.id}
          icon="spark"
          title={t.name}
          subtitle={t.tech}
          action={`sheet:th:${t.id}`}
          handleAction={handleAction}
        />
      ))}

      <OptRow
        icon="spark"
        title="Recliner-based therapies"
        subtitle="Waiting for catalogue confirmation"
        action="sheet:th:recl"
        pill="Pending"
        handleAction={handleAction}
      />

      {DISC}
      <div style={{ height: 24, flexShrink: 0 }} />
    </div>
  );
}

// ─── LivTherapyDetail ─────────────────────────────────────────────────────────

export function LivTherapyDetail({
  therapyId,
  handleAction,
}: {
  therapyId: string;
  handleAction: (a: string) => void;
}) {
  // Recliner placeholder
  if (therapyId === "recl") {
    return (
      <div className="scroll">
        <BackButton action="sheet:gloss" label="Therapy glossary" handleAction={handleAction} />
        <h2 className="h2">Recliner-based therapies</h2>
        <div className="card empty">
          <p className="sub">
            These are not in the prototype's service list, so no description is written. Add them
            once the product team confirms the catalogue.
          </p>
        </div>
        <div style={{ height: 24, flexShrink: 0 }} />
      </div>
    );
  }

  const therapy = THERAPIES_DATA.find((t) => t.id === therapyId);
  if (!therapy) return null;

  return (
    <div className="scroll">
      <BackButton action="sheet:gloss" label={therapy.tech} handleAction={handleAction} />
      <h2 className="h2">{therapy.name}</h2>

      <VideoPlaceholder title={`Watch: ${therapy.name}`} />

      {therapy.sections.map((text, i) => (
        <SectionCard key={i} label={SECTION_LABELS[i]} text={text} />
      ))}

      <button
        type="button"
        className="btn"
        onClick={() => handleAction(therapy.ctaAction)}
      >
        {therapy.ctaLabel}
      </button>

      {DISC}
      <div style={{ height: 24, flexShrink: 0 }} />
    </div>
  );
}

// ─── LivPodEducation ─────────────────────────────────────────────────────────

export function LivPodEducation({
  handleAction,
}: {
  handleAction: (a: string) => void;
}) {
  const podTopic = LEARN_TOPICS.find((t) => t.id === "pod")!;

  return (
    <div className="scroll">
      <BackButton action="sheet:learn" label="Pod session" handleAction={handleAction} />
      <h2 className="h2">Go beyond your lab report</h2>

      <VideoPlaceholder title="Watch: a Pod session in two minutes" />

      {podTopic.sections.map(([heading, body]) => (
        <SectionCard key={heading} label={heading} text={body} />
      ))}

      <OptRow
        icon="spark"
        title="Therapies you may hear about"
        subtitle="Read the plain-language glossary"
        action="sheet:gloss"
        handleAction={handleAction}
      />

      <button type="button" className="btn" onClick={() => handleAction("sheet:centres")}>
        Find nearby centres
      </button>
      <button
        type="button"
        className="btn ghost"
        onClick={() => handleAction("newbook:pod")}
      >
        Book a Pod session
      </button>

      <p className="sub" style={{ fontSize: 12 }}>
        Booking is optional. Benefit claims are held back until marketing and clinical teams verify
        them.
      </p>
      <div style={{ height: 24, flexShrink: 0 }} />
    </div>
  );
}

// ─── LivCentres ──────────────────────────────────────────────────────────────

export function LivCentres({
  handleAction,
  locMsg,
  onRequestLocation,
}: {
  handleAction: (a: string) => void;
  locMsg: string;
  onRequestLocation: () => void;
}) {
  return (
    <div className="scroll">
      <BackButton action="sheet:pod" label="Nearby centres" handleAction={handleAction} />
      <h2 className="h2">Find a centre</h2>

      {/* Directory status notice */}
      <div className="card" style={{ gap: 6 }}>
        <span className="k">Directory status</span>
        <p className="sub">
          Not connected to a live directory. The centre below comes from the prototype's own screens,
          so it is not a verified listing. Production needs an endpoint with name, address,
          coordinates, services, phone and booking availability.
        </p>
      </div>

      <button
        type="button"
        className="btn ghost"
        onClick={onRequestLocation}
      >
        <LivIcon name="spark" size={18} />
        Use my location
      </button>
      <p className="sub" id="loc-msg">
        {locMsg}
      </p>

      {CENTRES.map((c) => (
        <div key={c.name} className="card" style={{ gap: 10 }}>
          <div>
            <div className="h3">{c.name}</div>
            <p className="sub" style={{ marginTop: 4 }}>
              {c.address} · {c.hours}
            </p>
          </div>

          {/* Distance & contact (needs live data) */}
          <table
            style={{ width: "100%", borderCollapse: "collapse" }}
            aria-label="Centre details"
          >
            <tbody>
              {[
                ["Distance", "Needs centre coordinates"],
                ["Contact", "Not in directory"],
              ].map(([lbl, val]) => (
                <tr key={lbl}>
                  <td
                    style={{
                      padding: "4px 0",
                      fontSize: 13,
                      color: "var(--liv-muted)",
                      paddingRight: 12,
                      whiteSpace: "nowrap",
                      borderBottom: "1px solid var(--liv-line)",
                    }}
                  >
                    {lbl}
                  </td>
                  <td
                    style={{
                      padding: "4px 0",
                      fontSize: 13,
                      fontWeight: 500,
                      textAlign: "right",
                      borderBottom: "1px solid var(--liv-line)",
                    }}
                  >
                    {val}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div>
            <span className="k">Services</span>
            <p className="sub" style={{ marginTop: 4 }}>
              {c.services.join(" · ")}
            </p>
          </div>

          <a
            className="btn ghost"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c.name} ${c.address}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "none" }}
          >
            Get directions
          </a>

          <button
            type="button"
            className="btn"
            onClick={() => handleAction("newbook:pod")}
          >
            Book a Pod session
          </button>
        </div>
      ))}

      <div style={{ height: 24, flexShrink: 0 }} />
    </div>
  );
}
