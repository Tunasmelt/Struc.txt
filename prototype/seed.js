/* Seed notes — lifted verbatim from the prototype's NOTES array.
   Stand-in data only: Phase 3/9 is board rendering + interaction, no API wiring. */
(function () {
  window.NF_SEED = {
    today: "2026-08-23",
    notes: [
      { id: "n1", tmpl: "meeting", title: "Q3 pricing review", date: "2026-08-19", rot: -1.6, x: 24, y: 16, w: 262, collapsed: false,
        fields: [
          { k: "Attendees", t: "people", v: ["Dana", "Marcus", "Priya", "You"] },
          { k: "Decisions", t: "text", v: "Hold the £29 tier. Annual discount moves from 15% to 20% starting September." },
          { k: "Blockers", t: "text", v: "Billing migration has to land before the annual change goes live." }
        ],
        tags: ["pricing", "q3"], sugg: ["revenue"],
        actions: [{ t: "Send revised pricing sheet to Marcus", due: "Aug 25", done: false }, { t: "Confirm billing migration date", due: null, done: true }],
        raw: "pricing call — dana marcus priya\nkeep 29 tier, everyone agreed\nannual disc 15 -> 20 from sept\nBUT billing migration needs to land first, marcus flagged\ni need to send the revised sheet by mon\ncheck migration date w/ eng" },

      { id: "n2", tmpl: "soap", title: "Patient RG — session 12", date: "2026-08-21", rot: 2.1, x: 318, y: 40, w: 262, collapsed: false,
        fields: [
          { k: "Subjective", t: "text", v: "Reports sleep improved to ~6h/night. Work stress still the main trigger." },
          { k: "Objective", t: "text", v: "Engaged, steady affect. Completed thought record homework." },
          { k: "Assessment", t: "text", v: "Continued improvement. GAD-7 down to 9 from 14." },
          { k: "Plan", t: "text", v: "Introduce behavioural activation. Review in two weeks." }
        ],
        tags: ["RG", "cbt"], sugg: ["anxiety"],
        actions: [{ t: "Prep behavioural activation worksheet", due: "Sep 2", done: false }],
        raw: "rg session 12\nsleeping better, abt 6 hrs. work still the trigger\ngood engagement today, did the thought record\ngad7 9 (was 14)\nnext: behavioural activation, review in 2wks" },

      { id: "n3", tmpl: "journal", title: "Slow Sunday", date: "2026-08-23", rot: -2.4, x: 612, y: 20, w: 262, collapsed: false,
        fields: [
          { k: "Mood", t: "text", v: "Quiet, a bit restless" },
          { k: "Entry", t: "prose", v: "Spent most of the morning not doing much and felt guilty about it for an hour before deciding it was fine. The guilt is the habit, not the rest." }
        ],
        tags: ["personal"], sugg: ["reflection"], actions: [],
        raw: "slow sunday. did basically nothing all morning, felt bad about it for an hour then decided it was fine actually. the guilt is the habit not the rest" },

      { id: "n4", tmpl: "oneonone", title: "1:1 — Priya", date: "2026-08-18", rot: 1.2, x: 24, y: 352, w: 262, collapsed: false,
        fields: [
          { k: "Wins", t: "text", v: "Shipped the onboarding rewrite a week early." },
          { k: "Concerns", t: "text", v: "Feels unclear on what the next promotion actually requires." },
          { k: "Follow-ups", t: "checks", v: [{ t: "Share the levels doc", done: true }, { t: "Set up a skip-level with Dana", done: false }] }
        ],
        tags: ["team", "priya"], sugg: ["growth"],
        actions: [{ t: "Set up skip-level with Dana", due: "Aug 27", done: false }],
        raw: "1:1 priya\nonboarding rewrite shipped early, nice\nshe's fuzzy on promo criteria — wants to know what L5 actually needs\nsend her the levels doc (done during call)\nbook skip level w dana" },

      { id: "n5", tmpl: "lecture", title: "Distributed consensus — wk 4", date: "2026-08-14", rot: -0.8, x: 318, y: 404, w: 262, collapsed: false,
        fields: [
          { k: "Outline", t: "outline", v: ["Two-phase commit and where it blocks", "Paxos: proposers, acceptors, learners", "Raft as Paxos you can actually explain", "Quorum maths: why 2f+1"] },
          { k: "Exam note", t: "text", v: "He said the leader-election proof is 'very examinable'." }
        ],
        tags: ["cs", "distsys"], sugg: ["exam"],
        actions: [{ t: "Re-read the Raft paper before the exam", due: null, done: false }],
        raw: "wk4 consensus\n2pc — blocks if coordinator dies\npaxos: proposer acceptor learner\nraft = paxos but explainable\nquorum 2f+1, why\nHE SAID leader election proof is very examinable !!\nreread raft paper" },

      { id: "n6", tmpl: "interview", title: "User interview — Sam, solo PT", date: "2026-08-20", rot: 1.9, x: 612, y: 330, w: 262, collapsed: false,
        fields: [
          { k: "Context", t: "text", v: "Runs a one-person physio practice, 18 clients/week." },
          { k: "Pain", t: "text", v: "Writes notes at 9pm from memory. Says accuracy drops badly after the third session of the day." },
          { k: "Quote", t: "prose", v: "“I'd pay just to stop doing this at night.”" }
        ],
        tags: ["research", "discovery"], sugg: ["pricing"],
        actions: [{ t: "Ask Sam for a screen recording of current workflow", due: "Aug 26", done: false }],
        raw: "interview sam - solo physio, 18 clients/wk\nwrites all notes at 9pm from memory\naccuracy tanks after 3rd session of the day (his words)\n\"id pay just to stop doing this at night\"\nask him to screen record how he does it now" },

      { id: "n7", tmpl: "fieldlog", title: "Site visit — Warehouse 3", date: "2026-08-12", rot: -1.4, x: 906, y: 56, w: 262, collapsed: false,
        fields: [
          { k: "Conditions", t: "text", v: "41°C, dry. Loading bay fans running." },
          { k: "Checks", t: "checks", v: [{ t: "Racking inspection", done: true }, { t: "Fire exit clearance", done: true }, { t: "Cold store seal", done: false }] },
          { k: "Notes", t: "text", v: "Cold store door seal is perished on the hinge side. Reported to facilities." }
        ],
        tags: ["ops", "site"], sugg: ["maintenance"],
        actions: [{ t: "Chase facilities on cold store seal", due: "Aug 24", done: false }],
        raw: "wh3 visit, 41deg, dry, bay fans on\nracking ok\nfire exits clear\ncold store seal NOT ok - perished hinge side\ntold facilities, chase them" }
    ]
  };
})();
