import type { Settings } from "@prisma/client";
import { saveScheduleAction } from "@/app/admin/(protected)/actions";

const TIMEZONES = [
  "Europe/Paris",
  "Europe/Brussels",
  "Europe/Zurich",
  "Europe/Luxembourg",
  "Europe/Monaco",
  "America/Montreal",
  "America/Toronto",
  "Africa/Abidjan",
  "Africa/Dakar",
  "Indian/Reunion",
  "America/Martinique",
  "America/Guadeloupe",
  "Pacific/Noumea",
  "UTC",
];

export function ScheduleForm({ settings, returnTo }: { settings: Settings; returnTo: string }) {
  const zones = TIMEZONES.includes(settings.timezone) ? TIMEZONES : [settings.timezone, ...TIMEZONES];
  return (
    <form action={saveScheduleAction}>
      <input type="hidden" name="returnTo" value={returnTo} />
      <div className="field">
        <label style={{ fontWeight: 400 }}>
          <input type="checkbox" name="autoSendEnabled" defaultChecked={settings.autoSendEnabled} />{" "}
          <strong>Newsletter automatique</strong> (ON / OFF)
        </label>
      </div>
      <div className="grid" style={{ marginBottom: 0 }}>
        <div className="field">
          <label htmlFor="sendTime">Heure</label>
          <input id="sendTime" name="sendTime" type="time" required defaultValue={settings.sendTime} />
        </div>
        <div className="field">
          <label htmlFor="timezone">Fuseau horaire</label>
          <select id="timezone" name="timezone" defaultValue={settings.timezone}>
            {zones.map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="frequency">Fréquence</label>
          <select id="frequency" name="frequency" defaultValue="daily">
            <option value="daily">Une fois par jour</option>
          </select>
        </div>
      </div>
      <button className="btn" type="submit">Enregistrer</button>
    </form>
  );
}
