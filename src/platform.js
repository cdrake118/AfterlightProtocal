export class MockStorageService {
  constructor({ namespace = "afterlight-protocol", area = undefined } = {}) {
    this.namespace = namespace;
    this.area = area ?? this.getDefaultArea();
    this.memory = MockStorageService.memory;
  }

  loadSettings(defaults = {}) {
    return { ...defaults, ...this.read("settings", {}) };
  }

  saveSettings(settings) {
    this.write("settings", settings);
    return this.loadSettings();
  }

  loadUnlockedAchievements() {
    return this.read("achievements", []);
  }

  saveUnlockedAchievements(ids) {
    this.write("achievements", [...ids]);
  }

  loadCareerStats() {
    return this.read("career", null);
  }

  saveCareerStats(stats) {
    this.write("career", stats);
    return this.loadCareerStats();
  }

  loadLoadout(defaults = {}) {
    return { ...defaults, ...this.read("loadout", {}) };
  }

  saveLoadout(loadout) {
    this.write("loadout", loadout);
    return this.loadLoadout();
  }

  loadEntitlements(defaults = []) {
    return this.read("entitlements", defaults);
  }

  saveEntitlements(entitlements) {
    this.write("entitlements", [...entitlements]);
    return this.loadEntitlements();
  }

  loadFeedbackReports() {
    return this.read("feedbackReports", []);
  }

  saveFeedbackReports(reports) {
    this.write("feedbackReports", [...reports]);
    return this.loadFeedbackReports();
  }

  read(key, fallback) {
    const raw = this.getItem(this.key(key));
    if (!raw) {
      return fallback;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  write(key, value) {
    this.setItem(this.key(key), JSON.stringify(value));
  }

  key(key) {
    return `${this.namespace}:${key}`;
  }

  getItem(key) {
    try {
      return this.area?.getItem?.(key) ?? this.memory.get(key) ?? null;
    } catch {
      return this.memory.get(key) ?? null;
    }
  }

  setItem(key, value) {
    try {
      this.area?.setItem?.(key, value);
    } catch {
      this.memory.set(key, value);
      return;
    }
    if (!this.area?.setItem) {
      this.memory.set(key, value);
    }
  }

  getDefaultArea() {
    try {
      return globalThis.window && "localStorage" in globalThis.window
        ? globalThis.window.localStorage
        : null;
    } catch {
      return null;
    }
  }
}

MockStorageService.memory = new Map();

export class MockLobbyService {
  constructor() {
    this.lobby = null;
    this.listeners = new Set();
    this.directory = [
      {
        id: "pub-1842",
        inviteCode: "NOVA42",
        privacy: "public",
        host: "Northstar",
        map: "Observatory Annex",
        region: "USE",
        ping: 32,
        players: 3,
        capacity: 5
      },
      {
        id: "pub-2716",
        inviteCode: "TIDE71",
        privacy: "public",
        host: "Glassline",
        map: "Tideglass Aquarium",
        region: "USW",
        ping: 68,
        players: 4,
        capacity: 5
      },
      {
        id: "priv-9035",
        inviteCode: "CIPH35",
        privacy: "private",
        host: "Cipher",
        map: "Observatory Annex",
        region: "USE",
        ping: 44,
        players: 2,
        capacity: 5
      },
      {
        id: "pub-4208",
        inviteCode: "PRSM08",
        privacy: "public",
        host: "Kiln",
        map: "Prism Foundry",
        region: "USC",
        ping: 52,
        players: 3,
        capacity: 5
      },
      {
        id: "pub-6621",
        inviteCode: "MANR21",
        privacy: "public",
        host: "Gloamhall",
        map: "Gloamhall Manor",
        region: "USE",
        ping: 39,
        players: 4,
        capacity: 5
      }
    ];
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  create({ role, map = "Observatory Annex" }) {
    const id = `local-${Math.floor(Math.random() * 9000 + 1000)}`;
    this.lobby = {
      id,
      inviteCode: this.makeInviteCode(id),
      privacy: "private",
      host: "Player",
      region: "Local",
      capacity: 5,
      members: [
        { id: "player", name: "Player", role, ready: false },
        { id: "bot-1", name: "Vale", role: "Investigator", ready: true },
        { id: "bot-2", name: "Mira", role: "Investigator", ready: true },
        { id: "bot-3", name: "Sable", role: "Investigator", ready: true }
      ],
      map,
      state: "open"
    };
    this.emit();
    return this.getState();
  }

  quickJoin({ role, map }) {
    const candidates = this.search({ map }).filter((lobby) => lobby.privacy === "public" && lobby.players < lobby.capacity);
    if (candidates.length) {
      return this.join({ id: candidates[0].id, role });
    }
    this.create({ role, map });
    this.lobby.privacy = "public";
    this.emit();
    return this.getState();
  }

  search({ map } = {}) {
    return this.directory
      .filter((lobby) => !map || lobby.map === map)
      .map((lobby) => structuredClone(lobby));
  }

  join({ id, inviteCode, role }) {
    const code = this.normalizeInviteCode(inviteCode);
    const listing = this.directory.find((lobby) => lobby.id === id || lobby.inviteCode === code);
    if (!listing) {
      return null;
    }
    const hostRole = role === "Anomaly" ? "Investigator" : "Anomaly";
    this.lobby = {
      id: listing.id,
      inviteCode: listing.inviteCode,
      privacy: listing.privacy,
      host: listing.host,
      region: listing.region,
      capacity: listing.capacity,
      members: [
        { id: "host", name: listing.host, role: hostRole, ready: true },
        { id: "player", name: "Player", role, ready: false },
        { id: "bot-1", name: "Vale", role: "Investigator", ready: true },
        { id: "bot-2", name: "Mira", role: "Investigator", ready: listing.players > 3 }
      ].slice(0, Math.max(2, listing.players + 1)),
      map: listing.map,
      state: "open"
    };
    this.emit();
    return this.getState();
  }

  joinByInvite({ inviteCode, role }) {
    return this.join({ inviteCode, role });
  }

  setRole(role) {
    if (!this.lobby) {
      return;
    }
    const player = this.lobby.members.find((member) => member.id === "player");
    player.role = role;
    if (role === "Anomaly") {
      this.lobby.members
        .filter((member) => member.id !== "player")
        .forEach((member) => {
          member.role = "Investigator";
        });
    }
    this.emit();
  }

  setReady(ready) {
    if (!this.lobby) {
      return;
    }
    const player = this.lobby.members.find((member) => member.id === "player");
    player.ready = ready;
    this.lobby.state = ready ? "launching" : "open";
    this.emit();
  }

  setMap(map) {
    if (!this.lobby) {
      return;
    }
    this.lobby.map = map;
    this.emit();
  }

  getState() {
    return this.lobby ? structuredClone(this.lobby) : null;
  }

  emit() {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }

  normalizeInviteCode(value) {
    return String(value ?? "").trim().replace(/[^a-z0-9]/gi, "").toUpperCase();
  }

  makeInviteCode(id) {
    const source = this.normalizeInviteCode(id);
    return `AP${source.slice(-4)}`;
  }
}

export class MockAchievementService {
  constructor(storage) {
    this.storage = storage;
    this.unlocked = new Set(storage?.loadUnlockedAchievements?.() ?? []);
    this.definitions = [
      {
        id: "FIRST_SIGNAL",
        name: "First Signal",
        description: "Complete a match.",
        test: () => true
      },
      {
        id: "FIELD_TEAM",
        name: "Field Team",
        description: "Win as an investigator.",
        test: ({ role, outcome }) => role === "Investigator" && outcome.includes("contained")
      },
      {
        id: "DARK_PROTOCOL",
        name: "Dark Protocol",
        description: "Win as the anomaly.",
        test: ({ role, outcome }) => role === "Anomaly" && outcome.includes("collapsed")
      },
      {
        id: "LIFELINE",
        name: "Lifeline",
        description: "Revive a collapsed teammate.",
        test: ({ stats }) => stats.revives >= 1
      },
      {
        id: "SURGE_CONTROL",
        name: "Surge Control",
        description: "Use three role abilities in one round.",
        test: ({ stats }) => stats.abilityUses >= 3
      },
      {
        id: "STAY_POWERED",
        name: "Stay Powered",
        description: "Collect three battery refills in one round.",
        test: ({ stats }) => stats.pickups >= 3
      },
      {
        id: "ECHO_CHAMBER",
        name: "Echo Chamber",
        description: "Deploy six anomaly echoes in one round.",
        test: ({ role, stats }) => role === "Anomaly" && stats.echoesDeployed >= 6
      }
    ];
  }

  evaluateRound(summary) {
    const newlyUnlocked = [];
    for (const achievement of this.definitions) {
      if (!this.unlocked.has(achievement.id) && achievement.test(summary)) {
        this.unlocked.add(achievement.id);
        newlyUnlocked.push({
          id: achievement.id,
          name: achievement.name,
          description: achievement.description
        });
      }
    }
    if (newlyUnlocked.length) {
      this.storage?.saveUnlockedAchievements?.(this.unlocked);
    }
    return newlyUnlocked;
  }

  listUnlocked() {
    return this.definitions
      .filter((achievement) => this.unlocked.has(achievement.id))
      .map(({ id, name, description }) => ({ id, name, description }));
  }
}

export class MockStatsService {
  constructor(storage) {
    this.storage = storage;
    this.defaults = {
      matches: 0,
      investigatorWins: 0,
      anomalyWins: 0,
      draws: 0,
      totalRevives: 0,
      totalRelaysCharged: 0,
      totalRelaysCorrupted: 0,
      totalPickups: 0,
      totalAbilityUses: 0,
      totalEchoesDeployed: 0,
      totalEchoesDispelled: 0,
      bestContainTime: null,
      lastOutcome: null,
      lastMap: null,
      lastRole: null
    };
  }

  getProfile() {
    return {
      ...this.defaults,
      ...(this.storage?.loadCareerStats?.() ?? {})
    };
  }

  recordRound(summary) {
    const profile = this.getProfile();
    const next = {
      ...profile,
      matches: profile.matches + 1,
      totalRevives: profile.totalRevives + Math.round(summary.stats.revives),
      totalRelaysCharged: profile.totalRelaysCharged + Math.round(summary.stats.relaysCharged),
      totalRelaysCorrupted: profile.totalRelaysCorrupted + Math.round(summary.stats.relaysCorrupted),
      totalPickups: profile.totalPickups + Math.round(summary.stats.pickups),
      totalAbilityUses: profile.totalAbilityUses + Math.round(summary.stats.abilityUses),
      totalEchoesDeployed: profile.totalEchoesDeployed + Math.round(summary.stats.echoesDeployed ?? 0),
      totalEchoesDispelled: profile.totalEchoesDispelled + Math.round(summary.stats.echoesDispelled ?? 0),
      lastOutcome: summary.outcome,
      lastMap: summary.map,
      lastRole: summary.role
    };

    if (summary.outcome.includes("contained")) {
      next.investigatorWins += 1;
      const elapsed = Math.max(0, Math.round(300 - summary.timeRemaining));
      next.bestContainTime = next.bestContainTime === null ? elapsed : Math.min(next.bestContainTime, elapsed);
    } else if (summary.outcome.includes("collapsed")) {
      next.anomalyWins += 1;
    } else {
      next.draws += 1;
    }

    this.storage?.saveCareerStats?.(next);
    return next;
  }
}

export class MockEntitlementService {
  constructor(storage) {
    this.storage = storage;
    this.defaultOwned = ["base_game"];
    this.owned = new Set(storage?.loadEntitlements?.(this.defaultOwned) ?? this.defaultOwned);
  }

  owns(id) {
    return this.owned.has(id);
  }

  grant(id) {
    this.owned.add(id);
    this.persist();
    return this.listOwned();
  }

  revoke(id) {
    if (id === "base_game") {
      return this.listOwned();
    }
    this.owned.delete(id);
    this.persist();
    return this.listOwned();
  }

  listOwned() {
    return [...this.owned];
  }

  persist() {
    this.storage?.saveEntitlements?.(this.owned);
  }
}

export class MockCosmeticService {
  constructor(storage, entitlements) {
    this.storage = storage;
    this.entitlements = entitlements;
    this.suits = [
      {
        id: "field",
        name: "Field White",
        color: "#dfefff",
        sprite: "brown",
        entitlement: "base_game"
      },
      {
        id: "aqua",
        name: "Tideglass",
        color: "#7ae4d6",
        sprite: "blond",
        entitlement: "base_game"
      },
      {
        id: "ember",
        name: "Emberline",
        color: "#f4b35d",
        sprite: "brown",
        entitlement: "base_game"
      },
      {
        id: "violet",
        name: "Violet Lab",
        color: "#c7a8ff",
        sprite: "black",
        entitlement: "base_game"
      },
      {
        id: "prism",
        name: "Prism Signal",
        color: "#9fffe0",
        sprite: "red",
        entitlement: "afterlight_prism_pack"
      }
    ];
  }

  getCatalog() {
    return this.suits.map((suit) => ({
      ...suit,
      unlocked: this.isUnlocked(suit)
    }));
  }

  getLoadout() {
    const saved = this.storage?.loadLoadout?.({ suitId: "field" }) ?? { suitId: "field" };
    const suit = this.findSuit(saved.suitId) ?? this.suits[0];
    return { suitId: suit.id, suit };
  }

  equipSuit(suitId) {
    const suit = this.findSuit(suitId) ?? this.suits[0];
    this.storage?.saveLoadout?.({ suitId: suit.id });
    return this.getLoadout();
  }

  cycleSuit(direction = 1) {
    const loadout = this.getLoadout();
    const unlocked = this.suits.filter((suit) => this.isUnlocked(suit));
    const index = Math.max(0, unlocked.findIndex((suit) => suit.id === loadout.suitId));
    const next = unlocked[(index + direction + unlocked.length) % unlocked.length];
    return this.equipSuit(next.id);
  }

  findSuit(suitId) {
    const suit = this.suits.find((candidate) => candidate.id === suitId);
    return suit && this.isUnlocked(suit) ? suit : null;
  }

  isUnlocked(suit) {
    return this.entitlements?.owns?.(suit.entitlement) ?? suit.entitlement === "base_game";
  }
}

export class MockPresenceService {
  constructor() {
    this.activity = {
      state: "menu",
      details: "In menus",
      map: null,
      role: null,
      party: null,
      inviteCode: null,
      updatedAt: Date.now()
    };
    this.listeners = new Set();
  }

  setActivity(activity) {
    this.activity = {
      ...this.activity,
      ...activity,
      updatedAt: Date.now()
    };
    this.emit();
    return this.getActivity();
  }

  clearActivity() {
    return this.setActivity({
      state: "menu",
      details: "In menus",
      map: null,
      role: null,
      party: null,
      inviteCode: null
    });
  }

  getActivity() {
    return structuredClone(this.activity);
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getActivity());
    return () => this.listeners.delete(listener);
  }

  emit() {
    const state = this.getActivity();
    this.listeners.forEach((listener) => listener(state));
  }
}

export class MockPlaytestFeedbackService {
  constructor(storage, { limit = 12 } = {}) {
    this.storage = storage;
    this.limit = limit;
  }

  savePacket(packet) {
    const savedAt = new Date().toISOString();
    const id = `rpt-${Date.now().toString(36)}-${Math.floor(Math.random() * 36 ** 2).toString(36).padStart(2, "0")}`;
    const archivedPacket = {
      ...structuredClone(packet),
      archive: {
        reportId: id,
        savedAt,
        savedReports: Math.min(this.limit, this.listReports().length + 1)
      }
    };
    const entry = {
      id,
      savedAt,
      role: archivedPacket.session?.role ?? null,
      map: archivedPacket.session?.map ?? null,
      outcome: archivedPacket.session?.outcome ?? null,
      packet: archivedPacket
    };
    const reports = [entry, ...this.listReports()].slice(0, this.limit);
    this.storage?.saveFeedbackReports?.(reports);
    return structuredClone(entry);
  }

  listReports() {
    return this.storage?.loadFeedbackReports?.() ?? [];
  }

  importReports(entries) {
    if (!Array.isArray(entries)) {
      return {
        imported: 0,
        skipped: 0,
        total: this.listReports().length
      };
    }

    const existing = this.listReports();
    const seen = new Set(existing.map((report) => report.id));
    const imported = [];
    let skipped = 0;

    entries.forEach((entry) => {
      const report = this.normalizeReport(entry);
      if (!report || seen.has(report.id)) {
        skipped += 1;
        return;
      }
      seen.add(report.id);
      imported.push(report);
    });

    const reports = [...imported, ...existing]
      .sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt))
      .slice(0, this.limit);
    this.storage?.saveFeedbackReports?.(reports);
    return {
      imported: imported.length,
      skipped,
      total: reports.length
    };
  }

  normalizeReport(entry) {
    if (!entry || typeof entry !== "object") {
      return null;
    }
    const packet = entry.packet && typeof entry.packet === "object" ? structuredClone(entry.packet) : null;
    const id = typeof entry.id === "string" && entry.id.trim()
      ? entry.id.trim()
      : packet?.archive?.reportId;
    const archivedSavedAt = packet?.archive?.savedAt;
    const savedAt = typeof entry.savedAt === "string" && !Number.isNaN(Date.parse(entry.savedAt))
      ? entry.savedAt
      : typeof archivedSavedAt === "string" && !Number.isNaN(Date.parse(archivedSavedAt))
        ? archivedSavedAt
        : null;
    if (!id || !savedAt || !packet?.session) {
      return null;
    }
    return {
      id,
      savedAt,
      role: entry.role ?? packet.session.role ?? null,
      map: entry.map ?? packet.session.map ?? null,
      outcome: entry.outcome ?? packet.session.outcome ?? null,
      packet
    };
  }

  clearReports() {
    this.storage?.saveFeedbackReports?.([]);
    return [];
  }
}

export class LocalLoopbackTransport {
  constructor() {
    this.peers = new Map();
    this.sessions = new Map();
  }

  createPeer({ peerId = `peer-${Math.floor(Math.random() * 9000 + 1000)}` } = {}) {
    const peer = new LocalLoopbackPeer(this, peerId);
    this.peers.set(peerId, peer);
    return peer;
  }

  connect(peer, { sessionId, mode }) {
    this.disconnect(peer, "reconnect");
    peer.sessionId = sessionId;
    peer.mode = mode;
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, new Set());
    }
    this.sessions.get(sessionId).add(peer.peerId);
  }

  disconnect(peer, reason = "closed") {
    if (!peer.sessionId) {
      return;
    }
    const sessionPeers = this.sessions.get(peer.sessionId);
    sessionPeers?.delete(peer.peerId);
    if (sessionPeers?.size === 0) {
      this.sessions.delete(peer.sessionId);
    }
    peer.sessionId = null;
    peer.mode = null;
    peer.lastDisconnectReason = reason;
  }

  route(sender, message) {
    if (!sender.sessionId) {
      return [];
    }
    const sessionPeers = this.sessions.get(sender.sessionId) ?? new Set();
    const delivered = [];
    sessionPeers.forEach((peerId) => {
      if (peerId === sender.peerId) {
        return;
      }
      const peer = this.peers.get(peerId);
      if (!peer) {
        return;
      }
      const routedMessage = {
        ...structuredClone(message),
        originPeerId: sender.peerId,
        receivedAt: Date.now()
      };
      peer.receive(routedMessage);
      delivered.push(peerId);
    });
    return delivered;
  }

  getState() {
    return {
      peerCount: this.peers.size,
      sessions: [...this.sessions.entries()].map(([sessionId, peerIds]) => ({
        id: sessionId,
        peers: [...peerIds]
      }))
    };
  }
}

class LocalLoopbackPeer {
  constructor(hub, peerId) {
    this.hub = hub;
    this.peerId = peerId;
    this.sessionId = null;
    this.mode = null;
    this.lastDisconnectReason = null;
    this.listeners = new Set();
  }

  connect({ sessionId, mode }) {
    this.hub.connect(this, { sessionId, mode });
  }

  send(message) {
    return this.hub.route(this, message);
  }

  disconnect(reason = "closed") {
    this.hub.disconnect(this, reason);
  }

  receive(message) {
    const cloned = structuredClone(message);
    this.listeners.forEach((listener) => listener(cloned));
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getState() {
    return {
      peerId: this.peerId,
      sessionId: this.sessionId,
      mode: this.mode,
      connected: Boolean(this.sessionId)
    };
  }
}

export class MockNetworkSessionService {
  constructor({ transport = null, peerId = `peer-${Math.floor(Math.random() * 9000 + 1000)}` } = {}) {
    this.session = null;
    this.peerId = peerId;
    this.transport = transport;
    this.transportPeer = transport?.createPeer?.({ peerId }) ?? null;
    this.listeners = new Set();
    this.sent = [];
    this.received = [];
    this.transportPeer?.subscribe((message) => {
      this.receive(message);
    });
  }

  host({ lobbyId = null, map, role }) {
    this.session = {
      id: `session-${Math.floor(Math.random() * 9000 + 1000)}`,
      mode: "host",
      lobbyId,
      map,
      role,
      connected: true,
      startedAt: Date.now()
    };
    this.transportPeer?.connect({ sessionId: this.session.id, mode: "host" });
    this.record({ type: "session_hosted", reliable: true, payload: this.getState() });
    return this.getState();
  }

  connect({ sessionId, map, role }) {
    this.session = {
      id: sessionId,
      mode: "client",
      lobbyId: null,
      map,
      role,
      connected: true,
      startedAt: Date.now()
    };
    this.transportPeer?.connect({ sessionId, mode: "client" });
    this.record({ type: "session_connected", reliable: true, payload: this.getState() });
    return this.getState();
  }

  sendReliable(type, payload = {}) {
    return this.send(type, payload, true);
  }

  sendUnreliable(type, payload = {}) {
    return this.send(type, payload, false);
  }

  send(type, payload, reliable) {
    if (!this.session?.connected) {
      return null;
    }
    const message = {
      type,
      reliable,
      sessionId: this.session.id,
      originPeerId: this.peerId,
      payload: structuredClone(payload),
      sentAt: Date.now()
    };
    this.record(message);
    this.transportPeer?.send(message);
    return structuredClone(message);
  }

  disconnect(reason = "closed") {
    if (!this.session) {
      return null;
    }
    const previous = this.getState();
    this.session.connected = false;
    const message = {
      type: "session_disconnected",
      reliable: true,
      sessionId: previous.id,
      originPeerId: this.peerId,
      payload: { reason },
      sentAt: Date.now()
    };
    this.record(message);
    this.transportPeer?.send(message);
    this.transportPeer?.disconnect(reason);
    return previous;
  }

  record(message) {
    this.sent.push(message);
    this.emit(message);
  }

  getState() {
    return this.session ? structuredClone(this.session) : null;
  }

  getMessages() {
    return this.sent.map((message) => structuredClone(message));
  }

  getReceivedMessages() {
    return this.received.map((message) => structuredClone(message));
  }

  getTransportState() {
    return this.transportPeer?.getState?.() ?? null;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  receive(message) {
    this.received.push(message);
    this.emit(message);
  }

  emit(message) {
    const cloned = structuredClone(message);
    this.listeners.forEach((listener) => listener(cloned));
  }
}

export class PlatformServices {
  constructor({ networkTransport = null, peerId = undefined } = {}) {
    this.storage = new MockStorageService();
    this.lobbies = new MockLobbyService();
    this.achievements = new MockAchievementService(this.storage);
    this.stats = new MockStatsService(this.storage);
    this.entitlements = new MockEntitlementService(this.storage);
    this.cosmetics = new MockCosmeticService(this.storage, this.entitlements);
    this.presence = new MockPresenceService();
    this.network = new MockNetworkSessionService({ transport: networkTransport, peerId });
    this.feedback = new MockPlaytestFeedbackService(this.storage);
  }
}
