(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,[80172,49570,e=>{var t=e.i(47167),a=e.i(3716);let i=function(){};var r=e.i(41790);let o=[{id:1,name:"initial",sql:`
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE TABLE sessions (
  id_hash TEXT PRIMARY KEY,            -- sha256 of the cookie token; raw token never stored
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  user_agent TEXT
);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE TABLE user_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  unit_system TEXT NOT NULL DEFAULT 'metric' CHECK (unit_system IN ('metric','imperial')),
  risk_profile TEXT NOT NULL DEFAULT 'general',
  updated_at TEXT NOT NULL
);
CREATE TABLE geo_areas (
  id TEXT PRIMARY KEY,                 -- e.g. gn:184745, pt:-1.28,36.82
  kind TEXT NOT NULL,                  -- point | admin | country | port | airport | marine-region
  name TEXT NOT NULL,
  country_code TEXT,
  admin1 TEXT,
  admin2 TEXT,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  elevation REAL,
  timezone TEXT,
  geometry TEXT,                       -- GeoJSON (Point/LineString/Polygon/Multi*)
  min_lat REAL, min_lon REAL, max_lat REAL, max_lon REAL,
  source TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX geo_areas_latlon ON geo_areas(latitude, longitude);
CREATE TABLE saved_locations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  area_id TEXT NOT NULL REFERENCES geo_areas(id),
  label TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, area_id)
);
CREATE TABLE data_providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT,
  license TEXT,
  auth TEXT,
  notes TEXT
);
CREATE TABLE datasets (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL REFERENCES data_providers(id),
  name TEXT NOT NULL,
  variables TEXT,                      -- JSON array
  units TEXT,                          -- JSON object variable -> unit
  spatial_coverage TEXT,
  spatial_resolution TEXT,
  temporal_coverage TEXT,
  update_frequency TEXT,
  processing TEXT,
  license TEXT,
  limitations TEXT,                    -- JSON array
  last_ingested_at TEXT,
  last_issued_at TEXT,
  quality_status TEXT
);
CREATE TABLE weather_observations (
  provider TEXT NOT NULL,
  station_id TEXT NOT NULL,
  variable TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  value REAL,
  unit TEXT NOT NULL,
  latitude REAL, longitude REAL, elevation REAL,
  qc TEXT,
  raw TEXT,
  ingested_at TEXT NOT NULL,
  PRIMARY KEY (provider, station_id, variable, observed_at)
);
CREATE INDEX obs_latlon ON weather_observations(latitude, longitude);
CREATE TABLE forecast_runs (
  id TEXT PRIMARY KEY,                 -- provider|model|location|issued_at
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  location_key TEXT NOT NULL,          -- coordKey or grid cell id
  latitude REAL NOT NULL, longitude REAL NOT NULL,
  issued_at TEXT NOT NULL,             -- model initialisation time
  ingested_at TEXT NOT NULL,
  UNIQUE(provider, model, location_key, issued_at)
);
CREATE INDEX runs_loc ON forecast_runs(location_key, issued_at);
CREATE TABLE forecast_values (
  run_id TEXT NOT NULL REFERENCES forecast_runs(id) ON DELETE CASCADE,
  variable TEXT NOT NULL,
  valid_at TEXT NOT NULL,
  lead_hours REAL NOT NULL,
  value REAL,
  unit TEXT NOT NULL,
  PRIMARY KEY (run_id, variable, valid_at)
);
CREATE INDEX fv_valid ON forecast_values(variable, valid_at);
CREATE TABLE climate_indices (
  index_name TEXT NOT NULL,            -- ONI, DMI, RMM, NINO34_WEEKLY, CO2_MLO ...
  period TEXT NOT NULL,                -- e.g. 2026-JAS, 2026-10-11, 2026-09
  value REAL,
  value2 REAL,                         -- e.g. RMM2
  phase TEXT,
  source TEXT NOT NULL,
  issued_at TEXT,
  ingested_at TEXT NOT NULL,
  PRIMARY KEY (index_name, period, source)
);
CREATE TABLE environmental_events (
  id TEXT PRIMARY KEY,                 -- source:source_id
  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  nature TEXT NOT NULL,                -- observed-event | official-warning | forecast-risk | model-indicated
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  severity TEXT NOT NULL,
  official_level TEXT,
  country TEXT,
  latitude REAL, longitude REAL,
  geometry TEXT,
  published_at TEXT,
  updated_at TEXT,
  starts_at TEXT, ends_at TEXT,
  version TEXT NOT NULL,               -- content hash; changes => update
  is_current INTEGER NOT NULL DEFAULT 1,
  payload TEXT NOT NULL,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  UNIQUE(source, source_id)
);
CREATE INDEX events_latlon ON environmental_events(latitude, longitude);
CREATE INDEX events_current ON environmental_events(is_current, type);
CREATE TABLE official_warnings (
  id TEXT PRIMARY KEY,                 -- issuer:identifier
  issuer TEXT NOT NULL,
  event TEXT NOT NULL,
  severity TEXT,
  urgency TEXT,
  certainty TEXT,
  headline TEXT,
  area_desc TEXT,
  geometry TEXT,
  sent_at TEXT, effective_at TEXT, onset_at TEXT, expires_at TEXT, ends_at TEXT,
  references_ids TEXT,                 -- JSON array of superseded ids (CAP references)
  link TEXT,
  version TEXT NOT NULL,
  payload TEXT NOT NULL,
  ingested_at TEXT NOT NULL
);
CREATE TABLE tide_predictions (
  station_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  t TEXT NOT NULL,
  height_m REAL NOT NULL,
  kind TEXT,                           -- H | L | null for interval
  datum TEXT NOT NULL,
  ingested_at TEXT NOT NULL,
  PRIMARY KEY (provider, station_id, t, datum)
);
CREATE TABLE historical_indicators (
  location_key TEXT NOT NULL,
  dataset TEXT NOT NULL,
  indicator TEXT NOT NULL,
  period TEXT NOT NULL,
  value REAL,
  unit TEXT,
  computed_at TEXT NOT NULL,
  PRIMARY KEY (location_key, dataset, indicator, period)
);
CREATE TABLE drought_assessments (
  location_key TEXT NOT NULL,
  index_name TEXT NOT NULL,            -- SPI | SPEI
  scale_months INTEGER NOT NULL,
  period TEXT NOT NULL,                -- YYYY-MM
  value REAL,
  category TEXT,
  computed_at TEXT NOT NULL,
  PRIMARY KEY (location_key, index_name, scale_months, period)
);
CREATE TABLE alert_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  saved_location_id TEXT NOT NULL REFERENCES saved_locations(id) ON DELETE CASCADE,
  types TEXT NOT NULL,                 -- JSON array of alert types
  min_severity TEXT NOT NULL DEFAULT 'moderate',
  include_derived INTEGER NOT NULL DEFAULT 1,
  channels TEXT NOT NULL,              -- JSON array: in-app | email | webhook | push | sms
  webhook_url TEXT,
  email TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE TABLE alerts (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES alert_subscriptions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,           -- stable identity of the underlying event
  version TEXT NOT NULL,               -- changes when the event materially changes
  is_official INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  severity TEXT NOT NULL,
  issuer TEXT NOT NULL,
  issued_at TEXT,
  effective_from TEXT,
  effective_to TEXT,
  impact_window TEXT,
  source_link TEXT,
  action TEXT,
  location_label TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active | updated | expired
  acknowledged_version TEXT,
  dismissed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(subscription_id, fingerprint)
);
CREATE INDEX alerts_user ON alerts(user_id, status);
CREATE TABLE notification_deliveries (
  id TEXT PRIMARY KEY,
  alert_id TEXT NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  alert_version TEXT NOT NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL,                -- pending | sent | failed | skipped
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(alert_id, alert_version, channel)
);
CREATE TABLE ingestion_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL,                -- running | ok | partial | failed | skipped
  records_seen INTEGER DEFAULT 0,
  records_written INTEGER DEFAULT 0,
  message TEXT
);
CREATE INDEX jobs_job ON ingestion_jobs(job, started_at);
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL,
  user_id TEXT,
  action TEXT NOT NULL,
  detail TEXT,
  ip_hash TEXT
);
CREATE TABLE cache (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  stored_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
`},{id:2,name:"era5_daily_store",sql:`
-- Daily ERA5 reanalysis per location, stored so each location's multi-decade
-- history is downloaded once and then refreshed incrementally (Open-Meteo
-- weights long archive requests heavily — see docs/DATA_SOURCES.md).
CREATE TABLE era5_daily (
  location_key TEXT NOT NULL,
  date TEXT NOT NULL,                  -- local calendar date YYYY-MM-DD
  tmean REAL, tmax REAL, tmin REAL, precip REAL, et0 REAL,
  PRIMARY KEY (location_key, date)
);
CREATE TABLE era5_locations (
  location_key TEXT PRIMARY KEY,
  latitude REAL NOT NULL, longitude REAL NOT NULL,
  grid_latitude REAL, grid_longitude REAL, elevation REAL, timezone TEXT,
  first_date TEXT NOT NULL,
  last_complete_date TEXT NOT NULL,    -- last date with non-null precipitation
  refreshed_at TEXT NOT NULL
);
`}];var n=e.i(87750);let s=globalThis;function l(){if(!s.__atmoDb){var e;let t;":memory:"!=(e="browser.db")&&i(r.default.dirname(e)),(t=new a.G(e)).exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;"),function(e){e.exec("CREATE TABLE IF NOT EXISTS schema_migrations (id INTEGER PRIMARY KEY, name TEXT, applied_at TEXT)");let t=new Set(e.prepare("SELECT id FROM schema_migrations").all().map(e=>e.id));for(let a of o)if(!t.has(a.id)){e.exec("BEGIN");try{e.exec(a.sql),e.prepare("INSERT INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?)").run(a.id,a.name,new Date().toISOString()),e.exec("COMMIT"),n.d.info("db.migrated",{id:a.id,name:a.name})}catch(t){throw e.exec("ROLLBACK"),t}}}(t),s.__atmoDb=t}return s.__atmoDb}e.s(["r",0,l,"w",0,()=>new Date().toISOString(),"O",0,function(e,t){e.exec("BEGIN");try{let a=t();return e.exec("COMMIT"),a}catch(t){throw e.exec("ROLLBACK"),t}}],49570);let d=globalThis,c=d.__atmoMem??=new Map,p=d.__atmoInflight??=new Map;function u(){return"0"!==t.default.env.CACHE_PERSIST}async function m(e,t,a){let i=Date.now(),r=c.get(e);if(!r&&(r=function(e){if(u())try{let t=l().prepare("SELECT value, stored_at, expires_at FROM cache WHERE key = ?").get(e);if(!t)return;return{value:JSON.parse(t.value),storedAt:t.stored_at,expiresAt:t.expires_at}}catch(t){n.d.warn("cache.read_failed",{key:e,error:(0,n.W)(t)})}}(e))&&c.set(e,r),r&&r.expiresAt>i)return{value:r.value,stale:!1,storedAt:r.storedAt};let o=p.get(e),s=o??(async()=>{try{let r=await a();var i={value:r,storedAt:Date.now(),expiresAt:Date.now()+1e3*t};if(c.size>=2e3){let e=c.keys().next().value;void 0!==e&&c.delete(e)}if(c.set(e,i),u())try{l().prepare("INSERT INTO cache (key, value, stored_at, expires_at) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, stored_at=excluded.stored_at, expires_at=excluded.expires_at").run(e,JSON.stringify(i.value),i.storedAt,i.expiresAt)}catch(t){n.d.warn("cache.write_failed",{key:e,error:(0,n.W)(t)})}return r}finally{p.delete(e)}})();o||p.set(e,s);try{return{value:await s,stale:!1,storedAt:Date.now()}}catch(t){if(r&&i-r.expiresAt<864e5)return n.d.warn("cache.serving_stale",{key:e,error:(0,n.W)(t)}),{value:r.value,stale:!0,storedAt:r.storedAt};throw t}}e.s(["Y",0,m,"G",0,function(e=864e5){try{l().prepare("DELETE FROM cache WHERE expires_at < ?").run(Date.now()-e)}catch{}}],80172)},49500,87750,44817,e=>{var t=e.i(47167);let a={debug:10,info:20,warn:30,error:40},i=a[t.default.env.LOG_LEVEL||"info"]??20;function r(e,t,r){if(a[e]<i)return;let o=JSON.stringify({t:new Date().toISOString(),level:e,msg:t,...r});"error"===e?console.error(o):"warn"===e?console.warn(o):console.log(o)}let o={debug:(e,t)=>r("debug",e,t),info:(e,t)=>r("info",e,t),warn:(e,t)=>r("warn",e,t),error:(e,t)=>r("error",e,t)};function n(e){return e instanceof Error?e.message:String(e)}e.s(["W",0,n,"d",0,o],87750);let s=[{url:"https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt",file:"cpc/oni.ascii.txt"},{url:"https://www.cpc.ncep.noaa.gov/data/indices/wksst9120.for",file:"cpc/wksst9120.for"},{url:"https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml",file:"cpc/ensodisc.shtml"},{url:"https://psl.noaa.gov/gcos_wgsp/Timeseries/Data/dmi.had.long.data",file:"psl/dmi.had.long.data"},{url:"https://psl.noaa.gov/mjo/mjoindex/romi.cpcolr.1x.txt",file:"psl/romi.cpcolr.1x.txt"},{url:"https://www.nhc.noaa.gov/CurrentStorms.json",file:"nhc/CurrentStorms.json"}],l=/^https:\/\/ozonewatch\.gsfc\.nasa\.gov\/meteorology\/figures\/ozone\/(to3areas|to3mins|omds)_(\d{4})_toms\+omi\+omps\.txt$/;function d(e){let t,a,i=s.find(t=>t.url===e);if(i)return i.file;let r=l.exec(e);return r?(t=r[1],a=Number(r[2]),`ozonewatch/${t}_${a}.txt`):null}e.s(["N",0,"awc/metars.json","m",0,d],44817);class c extends Error{provider;status;retryable;constructor(e,t,a,i=!1){super(`${e}: ${t}`),this.provider=e,this.status=a,this.retryable=i}}let p=globalThis,u=p.__atmoBreakers??=new Map;async function m(e,t){let a,i=new AbortController,r=setTimeout(()=>i.abort(),t.timeoutMs??15e3),o=(a=d(e))?`/sahrae-weather-app/relay/${a}`:e;try{let e=await (t.fetchImpl??fetch)(o,{signal:i.signal,headers:{Accept:"application/json, text/plain, */*",...t.headers},cache:"no-store"});if(!e.ok){let a=429===e.status||e.status>=500,i="";try{i=(await e.text()).slice(0,200)}catch{}throw new c(t.provider,`HTTP ${e.status} ${i}`.trim(),e.status,a)}return e}catch(a){if(a instanceof c)throw a;let e=a?.name==="AbortError";if(!e&&a instanceof TypeError)throw new c(t.provider,"this source could not be reached from your browser. You may be offline, or the source does not allow direct browser access (it works in the server version).",void 0,!1);throw new c(t.provider,e?"timeout":n(a),void 0,!0)}finally{clearTimeout(r)}}async function T(e,t){var a;let i,r,s=(a=t.provider,(r=u.get(a))||(r={failures:0,openedUntil:0,calls:0},u.set(a,r)),r);if(s.calls++,s.openedUntil>Date.now())throw new c(t.provider,"circuit open after repeated failures; retry shortly",void 0,!1);let l=t.retries??1;for(let a=0;a<=l;a++)try{let a=await m(e,t);return s.failures=0,s.lastSuccessAt=new Date().toISOString(),a}catch(e){if(i=e,!(e instanceof c&&e.retryable)||a===l)break;await new Promise(e=>setTimeout(e,400*2**a))}throw s.failures++,s.lastError=n(i),s.lastErrorAt=new Date().toISOString(),s.failures>=4&&(s.openedUntil=Date.now()+6e4,o.warn("circuit.open",{provider:t.provider,error:s.lastError})),i}async function E(e,t){let a=await T(e,t),i=await a.text();try{return JSON.parse(i)}catch{throw new c(t.provider,`invalid JSON (${i.slice(0,80)})`)}}async function v(e,t){return(await T(e,t)).text()}t.default.env.HTTP_USER_AGENT,e.s(["UpstreamError",0,c,"fetchJson",0,E,"fetchText",0,v,"providerHealth",0,function(){let e=Date.now();return[...u.entries()].map(([t,a])=>({provider:t,state:a.openedUntil>e?"open":a.failures>0?"degraded":"closed",consecutiveFailures:a.failures,calls:a.calls,lastError:a.lastError??null,lastErrorAt:a.lastErrorAt??null,lastSuccessAt:a.lastSuccessAt??null}))}],49500)},56203,e=>{var t=e.i(47167),a=e.i(49500),i=e.i(80172),r=e.i(46229),o=e.i(44817);let n="https://api.tidesandcurrents.noaa.gov";async function s(e){return(await (0,i.Y)(`coops:stations:${e}`,604800,async()=>(await (0,a.fetchJson)(`${n}/mdapi/prod/webapi/stations.json?type=${e}`,{provider:"noaa-coops",timeoutMs:4e4})).stations.map(e=>({id:e.id,name:e.name,lat:Number(e.lat),lng:Number(e.lng),state:e.state,type:e.type})))).value}async function l(e,t,a,i=100){let o=await s(a),n=null;for(let a of o){if(!Number.isFinite(a.lat)||!Number.isFinite(a.lng))continue;let o=(0,r._)(e,t,a.lat,a.lng);o<=i&&(!n||o<n.distanceKm)&&(n={...a,distanceKm:Math.round(o)})}return n}function d(e){if(e.error)throw Error(e.error.message);return(e.predictions??e.data??[]).map(e=>({t:new Date(e.t.replace(" ","T")+":00Z").toISOString(),v:parseFloat(e.v),type:e.type})).filter(e=>Number.isFinite(e.v))}async function c(e){if(!/^\d{7}$/.test(e))throw Error("invalid station");let t=new Date,r=e=>e.toISOString().slice(0,10).replace(/-/g,""),o=new Date(t.getTime()+2592e5),s=new Date(t.getTime()-864e5),l=`${n}/api/prod/datagetter?station=${e}&datum=MLLW&units=metric&time_zone=gmt&format=json&application=sahrae-weather`,[c,p,u]=await Promise.all([(0,i.Y)(`coops:hilo:${e}:${r(t)}`,21600,()=>(0,a.fetchJson)(`${l}&product=predictions&interval=hilo&begin_date=${r(s)}&end_date=${r(o)}`,{provider:"noaa-coops"})),(0,i.Y)(`coops:curve:${e}:${r(t)}`,21600,()=>(0,a.fetchJson)(`${l}&product=predictions&interval=h&begin_date=${r(s)}&end_date=${r(o)}`,{provider:"noaa-coops"})),(0,i.Y)(`coops:obs:${e}`,360,()=>(0,a.fetchJson)(`${l}&product=water_level&range=24`,{provider:"noaa-coops"})).catch(()=>null)]),m=[];try{m=u?d(u.value):[]}catch{m=[]}return{hilo:d(c.value),predicted:d(p.value),observed:m,datum:"MLLW",fetchedAt:new Date(c.storedAt).toISOString()}}async function p(e){if(!/^\d{7}$/.test(e))throw Error("invalid station");return d((await (0,i.Y)(`coops:obs:${e}`,360,()=>(0,a.fetchJson)(`${n}/api/prod/datagetter?station=${e}&datum=MLLW&units=metric&time_zone=gmt&format=json&product=water_level&range=24&application=sahrae-weather`,{provider:"noaa-coops"}))).value)}async function u(e){let t=await (0,i.Y)(`coops:slt:${e}`,2592e3,()=>(0,a.fetchJson)(`${n}/dpapi/prod/webapi/product/sealvltrends.json?station=${e}`,{provider:"noaa-coops"})).catch(()=>null),r=t?.value.SeaLvlTrends?.[0];if(!r)return null;let o=e=>r.trendUnits.includes("inches/decade")?25.4*e/10:e;return{mmPerYear:Math.round(100*o(r.trend))/100,errorMmPerYear:Math.round(100*o(r.trendError))/100,startDate:r.startDate??null,endDate:r.endDate??null,stationName:r.stationName}}async function m(e,t,n=75){(e-1).toFixed(2),(t-1).toFixed(2),(e+1).toFixed(2),(t+1).toFixed(2);let s=await (0,i.Y)("metar:relay",600,()=>(0,a.fetchJson)(`/sahrae-weather-app/relay/${o.N}`,{provider:"awc-metar",timeoutMs:2e4}));return(Array.isArray(s.value)?s.value:[]).map(a=>({...a,distanceKm:(0,r._)(e,t,a.lat,a.lon)})).filter(e=>e.distanceKm<=n).sort((e,t)=>e.distanceKm-t.distanceKm||t.obsTime-e.obsTime)[0]??null}async function T(e,r){let o=t.default.env.NOMINATIM_BASE_URL||"https://nominatim.openstreetmap.org";if("1"===t.default.env.NOMINATIM_DISABLED)return null;let n=`nom:${e.toFixed(3)},${r.toFixed(3)}`,s=await (0,i.Y)(n,2592e3,()=>(0,a.fetchJson)(`${o}/reverse?lat=${e.toFixed(5)}&lon=${r.toFixed(5)}&format=jsonv2&zoom=10&accept-language=en`,{provider:"osm-nominatim",timeoutMs:8e3,retries:0})).catch(()=>null);return!s||s.value.error?null:s.value}async function E(){let e=await (0,i.Y)("rainviewer:maps",300,()=>(0,a.fetchJson)("https://api.rainviewer.com/public/weather-maps.json",{provider:"rainviewer"})),t=e.value.host;return{frames:[...[...e.value.radar?.past??[]].map(e=>({time:new Date(1e3*e.time).toISOString(),tileUrl:`${t}${e.path}/256/{z}/{x}/{y}/2/1_1.png`,kind:"observation"})),...[...e.value.radar?.nowcast??[]].map(e=>({time:new Date(1e3*e.time).toISOString(),tileUrl:`${t}${e.path}/256/{z}/{x}/{y}/2/1_1.png`,kind:"forecast"}))],fetchedAt:new Date(e.storedAt).toISOString()}}let v=[{id:"VIIRS_NOAA20_CorrectedReflectance_TrueColor",daily:!0,title:"Satellite true colour (VIIRS NOAA-20)",matrix:"GoogleMapsCompatible_Level9",ext:"jpg",group:"satellite",maxNativeZoom:9,description:"Daily true-colour composite. Clouds, smoke, dust and snow are visible; swath gaps appear as black stripes."},{id:"IMERG_Precipitation_Rate_30min",title:"Rain from satellite, latest half-hour (GPM IMERG Early)",matrix:"GoogleMapsCompatible_Level6",ext:"png",group:"precipitation",legend:"https://gibs.earthdata.nasa.gov/legends/GPM_Precipitation_Rate_H.svg",units:"mm/h",maxNativeZoom:6,description:"Satellite-estimated rain rate for the most recent available half-hour (IMERG Early run, latency ~4–6 h). Global between 60°S and 60°N, including oceans and areas without radar."},{id:"IMERG_Precipitation_Rate",daily:!0,title:"Rain from satellite, daily (GPM IMERG)",matrix:"GoogleMapsCompatible_Level6",ext:"png",group:"precipitation",legend:"https://gibs.earthdata.nasa.gov/legends/GPM_Precipitation_Rate_H.svg",units:"mm/h",maxNativeZoom:6,description:"Satellite-estimated precipitation rate (multi-satellite, gauge-informed). Daily layer."},{id:"SMAP_L4_Analyzed_Root_Zone_Soil_Moisture",daily:!0,title:"Root-zone soil moisture (SMAP L4)",matrix:"GoogleMapsCompatible_Level6",ext:"png",group:"land",legend:"https://gibs.earthdata.nasa.gov/legends/SMAP_Analyzed_Soil_Moisture_H.svg",units:"m³/m³",maxNativeZoom:6,description:"SMAP Level-4 model–satellite assimilation of root-zone (0–100 cm) soil moisture. ~9 km."},{id:"VIIRS_NOAA20_NDVI_8Day",daily:!0,title:"Vegetation health (NDVI, 8-day)",matrix:"GoogleMapsCompatible_Level8",ext:"png",group:"land",legend:"https://gibs.earthdata.nasa.gov/legends/MODIS_NDVI_H.svg",units:"NDVI",maxNativeZoom:8,description:"Rolling 8-day Normalized Difference Vegetation Index. Higher = denser green vegetation. Not an anomaly product."},{id:"MODIS_Terra_Land_Surface_Temp_Day",daily:!0,title:"Land surface temperature (day, MODIS)",matrix:"GoogleMapsCompatible_Level7",ext:"png",group:"temperature",legend:"https://gibs.earthdata.nasa.gov/legends/MODIS_Land_Surface_Temp_H.svg",units:"K",maxNativeZoom:7,description:"Temperature of the ground surface itself (clear skies only). It runs hotter than the air temperature on sunny days."},{id:"GHRSST_L4_MUR_Sea_Surface_Temperature",daily:!0,title:"Sea surface temperature (GHRSST MUR)",matrix:"GoogleMapsCompatible_Level7",ext:"png",group:"ocean",legend:"https://gibs.earthdata.nasa.gov/legends/GHRSST_Sea_Surface_Temperature_H.svg",units:"°C",maxNativeZoom:7,description:"Gap-free daily SST analysis (~1 km). Analysis, not raw retrieval."},{id:"GHRSST_L4_MUR_Sea_Surface_Temperature_Anomalies",daily:!0,title:"SST anomaly (GHRSST MUR)",matrix:"GoogleMapsCompatible_Level7",ext:"png",group:"ocean",legend:"https://gibs.earthdata.nasa.gov/legends/GHRSST_Sea_Surface_Temperature_Anomalies_H.svg",units:"°C",maxNativeZoom:7,description:"Daily SST anomaly relative to the product's own SST climatology (see the PO.DAAC MUR documentation for the reference period)."},{id:"OMPS_Ozone_Total_Column",daily:!0,title:"Total-column ozone (OMPS)",matrix:"GoogleMapsCompatible_Level6",ext:"png",group:"atmosphere",legend:"https://gibs.earthdata.nasa.gov/legends/OMPS_Ozone_Total_Column_H.svg",units:"DU",maxNativeZoom:6,description:"Total ozone above each point, in Dobson Units. Mostly the protective ozone layer high up, not ground-level pollution."},{id:"MODIS_Terra_Aerosol_Optical_Depth_3km",daily:!0,title:"Aerosol optical depth (MODIS 3 km)",matrix:"GoogleMapsCompatible_Level6",ext:"png",group:"atmosphere",legend:"https://gibs.earthdata.nasa.gov/legends/MODIS_VIIRS_AOD_H.svg",units:"AOD",maxNativeZoom:6,description:"Column aerosol loading (dust, smoke, haze) at 550 nm, clear-sky retrievals only."},{id:"OMPS_Aerosol_Index",daily:!0,title:"UV aerosol index (OMPS)",matrix:"GoogleMapsCompatible_Level6",ext:"png",group:"atmosphere",legend:"https://gibs.earthdata.nasa.gov/legends/OMPS_Aerosol_Index_H.svg",units:"index",maxNativeZoom:6,description:"Absorbing aerosols (dust, smoke), works above clouds."},{id:"TROPOMI_L2_Nitrogen_Dioxide_Tropospheric_Column",daily:!0,title:"NO₂ tropospheric column (TROPOMI)",matrix:"GoogleMapsCompatible_Level6",ext:"png",group:"atmosphere",legend:"https://gibs.earthdata.nasa.gov/legends/OMI_Nitrogen_Dioxide_Tropo_Column_H.svg",units:"molecules/cm²",maxNativeZoom:6,description:"Nitrogen dioxide in the lower atmosphere from the Sentinel-5P satellite. Shows burning from traffic, industry and fires; not a ground-level reading."}],h=e=>`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${e}/default/{time}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png`,g=e=>`https://view.eumetsat.int/geoserver/wms?service=WMS&version=1.3.0&request=GetMap&layers=${e}&styles=&format=image/png&transparent=true&crs=EPSG:3857&width=256&height=256&bbox={bbox-epsg-3857}&time={time}`,f={ir:{title:"Infrared cloud-top (geostationary, 10.3–10.8 µm)",description:"Brightness temperature of cloud tops and surface. Bright/cold = high, deep cloud (storms, cyclone eyewalls); dark = warm surface or low cloud. Works day and night. Five satellites mosaicked; colour scales differ slightly between NASA and EUMETSAT renderings.",sources:[{id:"goes-w",satellite:"GOES-West",subLon:-137,provider:"NOAA via NASA GIBS",template:h("GOES-West_ABI_Band13_Clean_Infrared"),maxzoom:6,attribution:"GOES-West: NOAA/NASA GIBS"},{id:"goes-e",satellite:"GOES-East",subLon:-75,provider:"NOAA via NASA GIBS",template:h("GOES-East_ABI_Band13_Clean_Infrared"),maxzoom:6,attribution:"GOES-East: NOAA/NASA GIBS"},{id:"msg-0",satellite:"Meteosat 0°",subLon:0,provider:"EUMETSAT EUMETView",template:g("msg_fes:ir108"),maxzoom:8,attribution:"Meteosat © EUMETSAT"},{id:"msg-iodc",satellite:"Meteosat IODC (45.5°E)",subLon:45.5,provider:"EUMETSAT EUMETView",template:g("msg_iodc:ir108"),maxzoom:8,attribution:"Meteosat © EUMETSAT"},{id:"himawari",satellite:"Himawari",subLon:140.7,provider:"JMA via NASA GIBS",template:h("Himawari_AHI_Band13_Clean_Infrared"),maxzoom:6,attribution:"Himawari: JMA/NASA GIBS"}]},airmass:{title:"Air Mass RGB (geostationary)",description:"Multi-channel composite: red/orange = dry, ozone-rich stratospheric air (jet streams, potential-vorticity anomalies, rapid cyclogenesis); green = moist tropical air; blue/purple = cold polar air; white = deep cloud.",sources:[{id:"goes-w",satellite:"GOES-West",subLon:-137,provider:"NOAA via NASA GIBS",template:h("GOES-West_ABI_Air_Mass"),maxzoom:6,attribution:"GOES-West: NOAA/NASA GIBS"},{id:"goes-e",satellite:"GOES-East",subLon:-75,provider:"NOAA via NASA GIBS",template:h("GOES-East_ABI_Air_Mass"),maxzoom:6,attribution:"GOES-East: NOAA/NASA GIBS"},{id:"msg-0",satellite:"Meteosat 0°",subLon:0,provider:"EUMETSAT EUMETView",template:g("msg_fes:rgb_airmass"),maxzoom:8,attribution:"Meteosat © EUMETSAT"},{id:"msg-iodc",satellite:"Meteosat IODC (45.5°E)",subLon:45.5,provider:"EUMETSAT EUMETView",template:g("msg_iodc:rgb_airmass"),maxzoom:8,attribution:"Meteosat © EUMETSAT"},{id:"himawari",satellite:"Himawari",subLon:140.7,provider:"JMA via NASA GIBS",template:h("Himawari_AHI_Air_Mass"),maxzoom:6,attribution:"Himawari: JMA/NASA GIBS"}]}};async function N(){return(await (0,i.Y)(`gibs:dates:${v.map(e=>e.id).join(",")}`,3600,async()=>{let e=await (0,a.fetchText)("https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml",{provider:"nasa-gibs",timeoutMs:6e4}),t={};for(let a of v){let i=e.indexOf(`<ows:Identifier>${a.id}</ows:Identifier>`);if(i<0)continue;let r=e.slice(i,i+2e4),o=/<Default>([^<]+)<\/Default>/.exec(r)?.[1];o&&(t[a.id]=o)}return t}).catch(()=>({value:{}}))).value}e.s(["D",0,f,"E",0,v,"i",0,p,"j",0,u,"K",0,c,"x",0,function(e=new Date,t=8,a=30,i=60){let r=6e4*a,o=Math.floor((e.getTime()-6e4*i)/r)*r;return Array.from({length:t},(e,a)=>new Date(o-(t-1-a)*r).toISOString().replace(".000Z","Z"))},"L",0,N,"N",0,function(e,t){return`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${e.id}/default/${t}/${e.matrix}/{z}/{y}/{x}.${e.ext}`},"c",0,l,"o",0,m,"d",0,function(e){if(null==e)return null;if("number"==typeof e)return Math.round(1609.344*e);let t=/^(\d+(?:\.\d+)?)\+?$/.exec(e.trim());return t?Math.round(1609.344*parseFloat(t[1])):null},"e",0,E,"F",0,T])},43753,e=>{let t="CC BY 4.0 data. Free API: non-commercial use only, <10,000 calls/day, 5,000/hour, 600/min. Commercial use requires a paid Open-Meteo plan (set OPEN_METEO_API_KEY).";e.s(["f",0,{"om-geocoding":{id:"om-geocoding",provider:"Open-Meteo (GeoNames)",providerUrl:"https://open-meteo.com/en/docs/geocoding-api",name:"Geocoding API (GeoNames gazetteer)",variables:["name","admin hierarchy","lat/lon","elevation","timezone","feature code"],units:{},spatialCoverage:"Global",spatialResolution:"Point gazetteer (places with population > ~1000, plus admin areas, airports, ports)",temporalCoverage:"Static",updateFrequency:"Periodic gazetteer refresh",updateIntervalSec:2592e3,processing:"Name search; results disambiguated by country/admin hierarchy in the UI.",license:"GeoNames CC BY 4.0; "+t,licenseVerified:!0,auth:"None (free tier)",limitations:["Small hamlets may be missing; use map click or coordinates instead."]},"osm-nominatim":{id:"osm-nominatim",provider:"OpenStreetMap Nominatim",providerUrl:"https://nominatim.org/",name:"Reverse geocoding",variables:["place name","admin hierarchy"],units:{},spatialCoverage:"Global",spatialResolution:"OSM features",temporalCoverage:"Current",updateFrequency:"Continuous",updateIntervalSec:86400,processing:"Used only to label map-click coordinates; results cached ≥ 7 days.",license:"ODbL 1.0, © OpenStreetMap contributors. Public instance usage policy: max 1 req/s, identifying User-Agent, no bulk use.",licenseVerified:!1,auth:"None; set NOMINATIM_BASE_URL for a self-hosted instance in production",limitations:["Public instance is not for heavy production traffic."]},"om-forecast":{id:"om-forecast",provider:"Open-Meteo",providerUrl:"https://open-meteo.com/en/docs",name:"Weather Forecast API (best_match blend of national & global NWP models)",variables:["temperature_2m","apparent_temperature","relative_humidity_2m","dew_point_2m","pressure_msl","surface_pressure","wind_speed_10m","wind_direction_10m","wind_gusts_10m","cloud_cover","precipitation","precipitation_probability","visibility","shortwave_radiation","uv_index","weather_code","cape","soil_moisture","et0_fao_evapotranspiration","wind at 850/500/250 hPa"],units:{temperature:"°C",precipitation:"mm",wind:"km/h",pressure:"hPa",visibility:"m"},spatialCoverage:"Global",spatialResolution:"1–11 km regional models where available, ~9–25 km global (varies by location)",temporalCoverage:"Hourly, 0–16 days ahead (15-minutely for 'current')",updateFrequency:"Hourly ingestion of model runs (models run 1–4×/day)",updateIntervalSec:3600,processing:"Open-Meteo interpolates gridded NWP output to the point; 'current' is a model value, not a station reading.",license:t,licenseVerified:!0,auth:"None (free tier) / OPEN_METEO_API_KEY",limitations:["Model values, not observations.","Skill decreases with lead time; days 8–16 are low-skill.","precipitation_probability is derived from ensemble members and is available only for part of the horizon."]},"om-ensemble":{id:"om-ensemble",provider:"Open-Meteo (ECMWF IFS ENS, NCEP GEFS)",providerUrl:"https://open-meteo.com/en/docs/ensemble-api",name:"Ensemble API",variables:["temperature_2m members","precipitation members"],units:{temperature:"°C",precipitation:"mm"},spatialCoverage:"Global",spatialResolution:"ECMWF ENS 0.25°, GEFS 0.25°/0.5°",temporalCoverage:"Up to 15 days (ECMWF) / 35 days (GEFS)",updateFrequency:"2–4 runs per day",updateIntervalSec:21600,processing:"Platform computes member percentiles (10/50/90) and exceedance fractions.",license:t,licenseVerified:!0,auth:"None (free tier)",limitations:["Raw ensemble, not calibrated; the spread can understate the true uncertainty."]},"om-seasonal":{id:"om-seasonal",provider:"Open-Meteo (ECMWF SEAS5)",providerUrl:"https://open-meteo.com/en/docs/seasonal-forecast-api",name:"Seasonal Forecast API",variables:["temperature_2m_anomaly (monthly)","precipitation_anomaly (monthly)","daily ensemble members"],units:{temperature_anomaly:"K",precipitation_anomaly:"mm"},spatialCoverage:"Global",spatialResolution:"~36 km",temporalCoverage:"~7 months ahead",updateFrequency:"Monthly (new SEAS5 run on the 5th of each month)",updateIntervalSec:86400,processing:"Monthly anomalies as published; weekly aggregates of daily members computed by the platform for the extended range.",license:t,licenseVerified:!0,auth:"None (free tier)",limitations:["Probabilistic guidance only, not day-by-day weather.","Anomaly reference period per provider documentation; platform weekly comparison uses ERA5 1991–2020 and is not bias-corrected."]},"om-air-quality":{id:"om-air-quality",provider:"Open-Meteo (Copernicus CAMS)",providerUrl:"https://open-meteo.com/en/docs/air-quality-api",name:"Air Quality API (CAMS global / European)",variables:["pm10","pm2_5","ozone (ground-level)","nitrogen_dioxide","sulphur_dioxide","carbon_monoxide","dust","aerosol_optical_depth","uv_index","european_aqi","us_aqi"],units:{concentration:"µg/m³",aod:"dimensionless"},spatialCoverage:"Global (CAMS 0.4°); Europe (CAMS 0.1°)",spatialResolution:"~11 km Europe, ~45 km global",temporalCoverage:"Hourly, ~5 days ahead",updateFrequency:"CAMS runs twice daily (global) / daily (Europe)",updateIntervalSec:43200,processing:"Model concentrations at surface level.",license:t+" Contains modified Copernicus Atmosphere Monitoring Service information.",licenseVerified:!0,auth:"None (free tier)",limitations:["Model output, not monitor readings.","'ozone' here is GROUND-LEVEL ozone (pollution), not the stratospheric ozone layer."]},"om-marine":{id:"om-marine",provider:"Open-Meteo (MeteoFrance MFWAM, ECMWF WAM, Copernicus Marine SMOC)",providerUrl:"https://open-meteo.com/en/docs/marine-weather-api",name:"Marine Weather API",variables:["wave_height","wave_period","wave_direction","swell_wave_height","swell_wave_period","wind_wave_height","sea_surface_temperature","ocean_current_velocity","ocean_current_direction","sea_level_height_msl"],units:{height:"m",period:"s",current:"km/h",sst:"°C"},spatialCoverage:"Global oceans (coastal accuracy limited)",spatialResolution:"~8 km (currents, sea level) to ~25 km (waves)",temporalCoverage:"Hourly, up to ~8–10 days",updateFrequency:"Daily–twice daily",updateIntervalSec:43200,processing:"Gridded model output interpolated to the point.",license:t+" Contains Copernicus Marine Service information.",licenseVerified:!0,auth:"None (free tier)",limitations:["NOT for coastal navigation.","sea_level_height_msl is a model sea level (tides + surge + SLA) at about 8 km; not an official tide prediction.","Ocean current is a surface current; it combines tidal and non-tidal components and is not a tidal-current prediction."]},"om-flood":{id:"om-flood",provider:"Open-Meteo (Copernicus GloFAS)",providerUrl:"https://open-meteo.com/en/docs/flood-api",name:"Flood API (GloFAS v4 river discharge)",variables:["river_discharge","river_discharge_mean/median/min/max/p25/p75"],units:{discharge:"m³/s"},spatialCoverage:"Global river network",spatialResolution:"0.05° (~5 km)",temporalCoverage:"1984 → +7 months (forecast daily ensemble)",updateFrequency:"Daily",updateIntervalSec:86400,processing:"Nearest river cell to the coordinate; platform compares forecast to the 1991–2020 distribution of the same cell.",license:t+" Contains Copernicus Emergency Management Service information.",licenseVerified:!0,auth:"None (free tier)",limitations:["Nearest 5 km cell may not be the river of interest.","Not an official flood warning; national hydrological services define official flood thresholds."]},"om-archive":{id:"om-archive",provider:"Open-Meteo (ECMWF ERA5 / ERA5-Land)",providerUrl:"https://open-meteo.com/en/docs/historical-weather-api",name:"Historical Weather API (ERA5 reanalysis)",variables:["temperature_2m_mean/max/min","precipitation_sum","et0_fao_evapotranspiration"],units:{temperature:"°C",precipitation:"mm"},spatialCoverage:"Global",spatialResolution:"ERA5 0.25° (~25 km); ERA5-Land 0.1°",temporalCoverage:"1940 → ~5 days ago",updateFrequency:"Daily (≈5-day latency)",updateIntervalSec:86400,processing:"Platform aggregates to months/years, computes 1991–2020 normals, anomalies, OLS trends, SPI/SPEI.",license:t+" Contains modified Copernicus Climate Change Service information.",licenseVerified:!0,auth:"None (free tier)",limitations:["Reanalysis, not station observations; precipitation in particular can differ from gauges.","Grid-cell averages smooth local extremes and topography."]},"om-climate":{id:"om-climate",provider:"Open-Meteo (CMIP6 HighResMIP)",providerUrl:"https://open-meteo.com/en/docs/climate-api",name:"Climate Change API (CMIP6 HighResMIP downscaled)",variables:["temperature_2m_mean","precipitation_sum"],units:{temperature:"°C",precipitation:"mm"},spatialCoverage:"Global",spatialResolution:"Models 20–50 km, downscaled to 10 km",temporalCoverage:"1950–2050",updateFrequency:"Static archive",updateIntervalSec:2592e3,processing:"Platform computes annual means per model and the multi-model range.",license:t,licenseVerified:!0,auth:"None (free tier)",limitations:["HighResMIP 'highres-future' experiment (SSP5-8.5 forcing per the CMIP6 HighResMIP protocol): a single high-emission scenario.","Projections are not forecasts; individual years are not predictions."]},"aviationweather-metar":{id:"aviationweather-metar",provider:"NOAA Aviation Weather Center",providerUrl:"https://aviationweather.gov/data/api/",name:"METAR surface observations",variables:["temperature","dew point","wind","visibility","pressure","clouds"],units:{temperature:"°C",wind:"kt (converted)",pressure:"hPa"},spatialCoverage:"Global airports reporting METAR",spatialResolution:"Station points",temporalCoverage:"Last ~hours",updateFrequency:"Typically hourly (+ specials)",updateIntervalSec:3600,processing:"Nearest station within 75 km shown as an actual observation with its distance.",license:"US Government work (public domain). API usage guidance: identifying User-Agent, ≤ 100 req/min.",licenseVerified:!1,auth:"None",limitations:["Airport stations may not represent nearby terrain/coast/urban conditions."]},nhc:{id:"nhc",provider:"NOAA National Hurricane Center",providerUrl:"https://www.nhc.noaa.gov/",name:"CurrentStorms.json + forecast cone/track (ArcGIS)",variables:["position","intensity","pressure","movement","forecast track","cone","warnings"],units:{intensity:"kt",pressure:"mb",speed:"mph"},spatialCoverage:"Atlantic, Eastern & Central North Pacific",spatialResolution:"Advisory points / polygons",temporalCoverage:"Active storms",updateFrequency:"Advisories every 6 h (3 h intermediates)",updateIntervalSec:10800,processing:"Fields shown verbatim; units converted.",license:"US Government work (public domain).",licenseVerified:!1,auth:"None",limitations:["Other basins: see GDACS (JTWC-based tracks) and the responsible RSMC."]},gdacs:{id:"gdacs",provider:"GDACS (European Commission JRC & UN OCHA)",providerUrl:"https://www.gdacs.org/",name:"Global Disaster Alert and Coordination System events",variables:["tropical cyclones","floods","droughts","wildfires","volcanoes","earthquakes"],units:{},spatialCoverage:"Global",spatialResolution:"Event points / polygons",temporalCoverage:"Current and recent events",updateFrequency:"Continuous (polled every 15 min)",updateIntervalSec:900,processing:"Filtered to environmental hazard types; alert colour = GDACS humanitarian impact level (not a national warning).",license:"Free public service; attribution to GDACS required. Terms page not retrievable on 2026-10-13; legal review needed before commercial use.",licenseVerified:!1,auth:"None",limitations:["GDACS alert levels estimate humanitarian impact; they are not official national meteorological warnings."]},"nws-alerts":{id:"nws-alerts",provider:"US National Weather Service",providerUrl:"https://www.weather.gov/documentation/services-web-api",name:"api.weather.gov active alerts (CAP)",variables:["event","severity","urgency","certainty","areas","effective/expires","instructions"],units:{},spatialCoverage:"United States & territories, adjacent marine zones",spatialResolution:"Zones / counties / polygons",temporalCoverage:"Active",updateFrequency:"Real time (polled ≤ 5 min per location)",updateIntervalSec:300,processing:"Shown verbatim (CAP fields).",license:"US Government work (public domain).",licenseVerified:!1,auth:"None (User-Agent required)",limitations:["US only."]},meteoalarm:{id:"meteoalarm",provider:"EUMETNET MeteoAlarm",providerUrl:"https://meteoalarm.org/",name:"MeteoAlarm CAP feeds (national services of ~38 European countries)",variables:["awareness type","awareness level","areas","onset/expires","instructions"],units:{},spatialCoverage:"Europe (member countries)",spatialResolution:"EMMA/NUTS warning regions",temporalCoverage:"Active",updateFrequency:"Real time (polled every 15 min)",updateIntervalSec:900,processing:"Warnings matched to location by country and region name; region outlines are not used in this version.",license:"Redistribution terms set by MeteoAlarm/EUMETNET; review required before commercial use.",licenseVerified:!1,auth:"None",limitations:["Region match is by name, so a warning may be shown for a whole country when the region cannot be resolved (flagged in the UI)."]},"cpc-oni":{id:"cpc-oni",provider:"NOAA Climate Prediction Center",providerUrl:"https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/ensostuff/ONI_v5.php",name:"Oceanic Niño Index (ERSSTv5, 3-month running mean)",variables:["ONI"],units:{ONI:"°C anomaly"},spatialCoverage:"Niño-3.4 region (5°N–5°S, 170°W–120°W)",spatialResolution:"Area average",temporalCoverage:"1950 → latest season",updateFrequency:"Monthly",updateIntervalSec:86400,processing:"Parsed verbatim; El Niño/La Niña threshold ±0.5 °C per CPC definition.",license:"US Government work (public domain).",licenseVerified:!1,auth:"None",limitations:["Official status requires the threshold to persist for 5 overlapping seasons; CPC also publishes a relative ONI (RONI) used in recent discussions."]},"cpc-enso-disc":{id:"cpc-enso-disc",provider:"NOAA Climate Prediction Center / IRI",providerUrl:"https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml",name:"ENSO Diagnostic Discussion",variables:["alert status","synopsis","probabilities (text)"],units:{},spatialCoverage:"Tropical Pacific",spatialResolution:"Not applicable (text bulletin)",temporalCoverage:"Current + ~9 months outlook",updateFrequency:"Monthly (second Thursday)",updateIntervalSec:86400,processing:"Alert status and synopsis extracted verbatim from the HTML.",license:"US Government work (public domain).",licenseVerified:!1,auth:"None",limitations:["Text extraction can break if CPC changes the page layout; the ingestion job watches for this."]},"psl-dmi":{id:"psl-dmi",provider:"NOAA Physical Sciences Laboratory",providerUrl:"https://psl.noaa.gov/gcos_wgsp/Timeseries/DMI/",name:"Dipole Mode Index (HadISST1.1)",variables:["DMI"],units:{DMI:"°C"},spatialCoverage:"Tropical Indian Ocean",spatialResolution:"Area-average difference",temporalCoverage:"1870 → recent months",updateFrequency:"Monthly (preliminary values)",updateIntervalSec:86400,processing:"Parsed verbatim; ±0.4 °C used as the indicative positive/negative IOD threshold (BoM convention).",license:"US Government work (public domain); HadISST © Met Office (non-commercial research licence; review).",licenseVerified:!1,auth:"None",limitations:["Monthly lag of 1–3 months; recent values preliminary.","BoM's weekly IOD and outlook is the operational reference for Australia."]},"psl-romi":{id:"psl-romi",provider:"NOAA Physical Sciences Laboratory",providerUrl:"https://psl.noaa.gov/mjo/mjoindex/",name:"Real-time OLR MJO Index (ROMI; Kiladis et al. 2014)",variables:["PC1","PC2","amplitude","phase (derived)"],units:{},spatialCoverage:"Tropics (20°S–20°N)",spatialResolution:"Index",temporalCoverage:"1991 → near real time",updateFrequency:"Daily (near real-time)",updateIntervalSec:86400,processing:"Phase computed on the RMM-analogous plane x = PC2, y = −PC1 (PSL guidance for OMI; ROMI shares the OMI EOFs). Amplitude ≥ 1 = active MJO.",license:"US Government work (public domain).",licenseVerified:!1,auth:"None",limitations:["OLR-only index; phases are broadly but not exactly comparable to BoM RMM phases.","BoM's RMM file (the common reference) blocks automated access and is therefore not used.","MJO forecasts are not ingested."]},coops:{id:"coops",provider:"NOAA CO-OPS (Tides & Currents)",providerUrl:"https://api.tidesandcurrents.noaa.gov/api/prod/",name:"Tide predictions, observed water levels, sea level trends",variables:["predictions (hi/lo, 6-min)","water_level","sea level trend"],units:{height:"m"},spatialCoverage:"US coasts, territories, some partner stations",spatialResolution:"Tide stations",temporalCoverage:"Predictions years ahead; observations real time",updateFrequency:"6-minute observations",updateIntervalSec:360,processing:"Nearest station within 100 km; predictions = astronomical (harmonic) tide.",license:"US Government work (public domain).",licenseVerified:!1,auth:"None",limitations:["US stations only. Outside coverage, official astronomical tide predictions require national hydrographic offices (often licensed, e.g. UKHO)."]},"gml-ghg":{id:"gml-ghg",provider:"NOAA Global Monitoring Laboratory",providerUrl:"https://gml.noaa.gov/ccgg/trends/",name:"Mauna Loa CO₂ and global CH₄ monthly means",variables:["CO2 (ppm)","CH4 (ppb)"],units:{CO2:"ppm",CH4:"ppb"},spatialCoverage:"Mauna Loa (CO₂) / global marine surface (CH₄)",spatialResolution:"Station / global mean",temporalCoverage:"1958 → last month (CO₂), 1983 → (CH₄)",updateFrequency:"Monthly",updateIntervalSec:86400,processing:"Parsed verbatim.",license:"Free use with citation per NOAA GML data policy.",licenseVerified:!1,auth:"None",limitations:["Background (well-mixed) concentrations, not local emissions."]},ozonewatch:{id:"ozonewatch",provider:"NASA Ozone Watch (GSFC)",providerUrl:"https://ozonewatch.gsfc.nasa.gov/",name:"Antarctic ozone hole area, minimum, mass deficit (TOMS+OMI+OMPS)",variables:["hole area (million km²)","minimum total column (DU)","mass deficit (Mt)"],units:{area:"million km²",ozone:"DU"},spatialCoverage:"Southern Hemisphere polar region",spatialResolution:"Satellite total-column retrievals, daily",temporalCoverage:"Current year daily, with 1979–2025 climatology percentiles",updateFrequency:"Daily",updateIntervalSec:86400,processing:"Parsed verbatim; climatology percentiles from the same file.",license:"NASA data: no restrictions; attribution requested.",licenseVerified:!1,auth:"None",limitations:["Total-column ozone (stratosphere-dominated), not ground-level ozone.","Hole metrics are near zero outside Aug–Dec by definition."]},gibs:{id:"gibs",provider:"NASA GIBS / Worldview",providerUrl:"https://nasa-gibs.github.io/gibs-api-docs/",name:"Global Imagery Browse Services WMTS",variables:["true colour","SST (GHRSST MUR)","IMERG precipitation rate","SMAP soil moisture","VIIRS NDVI","OMPS total ozone","MODIS AOD","TROPOMI NO₂"],units:{},spatialCoverage:"Global",spatialResolution:"Per layer (250 m – 25 km)",temporalCoverage:"Daily layers, latest date from GIBS capabilities",updateFrequency:"Daily (NRT within ~3–5 h)",updateIntervalSec:86400,processing:"Rendered imagery tiles served by NASA. These are pictures: the colours are not machine-readable values.",license:"NASA imagery: no restrictions; attribution to NASA GIBS/Worldview requested.",licenseVerified:!1,auth:"None",limitations:["Images, not data values, so no point readings.","Daily composites have swath gaps."]},eumetview:{id:"eumetview",provider:"EUMETSAT (EUMETView)",providerUrl:"https://view.eumetsat.int/",name:"Meteosat 0° and Indian Ocean imagery (WMS)",variables:["IR 10.8 µm brightness temperature","Air Mass RGB"],units:{},spatialCoverage:"Meteosat full disks centred on 0° and 45.5°E (Europe, Africa, Middle East, Indian Ocean)",spatialResolution:"~3 km at nadir",temporalCoverage:"Near real time (15-min), archive back to 2020",updateFrequency:"15 minutes",updateIntervalSec:900,processing:"Rendered imagery served by EUMETSAT; displayed as received.",license:"EUMETSAT data policy: display with '© EUMETSAT'; licences for Meteosat data commonly restrict operational/commercial use. Review before commercial launch.",licenseVerified:!1,auth:"None",limitations:["Imagery only (no values).","Colour scale differs from the NASA GIBS rendering of GOES/Himawari."]},"eox-s2cloudless":{id:"eox-s2cloudless",provider:"EOX IT Services GmbH",providerUrl:"https://cloudless.eox.at",name:"EOxCloudless 2025: Sentinel-2 cloud-free mosaic (satellite base map)",variables:["true-colour surface imagery"],units:{},spatialCoverage:"Global land and coastal waters",spatialResolution:"10 m (native up to zoom 14)",temporalCoverage:"Annual mosaic of 2025",updateFrequency:"Yearly",updateIntervalSec:31536e3,processing:"Cloud-free composite of Copernicus Sentinel-2 scenes made by EOX; displayed as received (WMTS, EPSG:3857).",license:"CC BY-NC-SA 4.0 (non-commercial, attribution 'EOxCloudless 2025 by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2025)'); commercial use needs an EOX licence. Stated in the service's capabilities, checked 2026-10-15.",licenseVerified:!0,auth:"None",limitations:["A fixed yearly picture of the ground; it does not show today's clouds or weather.","Seams and colour differences can appear between source scenes."]},"iem-asos":{id:"iem-asos",provider:"Iowa Environmental Mesonet (Iowa State University)",providerUrl:"https://mesonet.agron.iastate.edu/request/download.phtml",name:"Archive of worldwide METAR airport reports",variables:["air temperature","dew point","wind speed"],units:{temperature:"°C",wind:"kt"},spatialCoverage:"Airports worldwide that send METAR reports",spatialResolution:"Point (airport weather station)",temporalCoverage:"Decades to present",updateFrequency:"Hourly (as reports arrive)",updateIntervalSec:3600,processing:"Routine METARs (report type 3) for the last 72 hours; used only by the GitHub Pages version for the observed-vs-model comparison, because AWC does not allow browser requests.",license:"Freely available from Iowa State University's IEM; attribution requested.",licenseVerified:!1,auth:"None",limitations:["Same METAR reports as AWC, archived by IEM; a report can arrive a little later than on AWC."]},rainviewer:{id:"rainviewer",provider:"RainViewer",providerUrl:"https://www.rainviewer.com/api.html",name:"Weather Maps API: past radar mosaic",variables:["radar reflectivity (composite)"],units:{},spatialCoverage:"Where national radar networks share data (not global)",spatialResolution:"Tile imagery",temporalCoverage:"Past ~2 h, 10-min frames",updateFrequency:"10 minutes",updateIntervalSec:600,processing:"Tile URLs passed through with frame timestamps.",license:"Personal and educational use only (verified 2026-10-13); attribution to RainViewer requested. Replace for commercial launch.",licenseVerified:!0,auth:"None",limitations:["Gaps over oceans and countries without shared radar.","NOT licensed for commercial use."]},"platform-derived":{id:"platform-derived",provider:"Sahrae Weather (this platform)",providerUrl:"/sources",name:"Derived indicators (thresholds, SPI/SPEI, risk rules)",variables:["model-indicated hazards","SPI","SPEI","risk levels"],units:{},spatialCoverage:"As inputs",spatialResolution:"As inputs",temporalCoverage:"As inputs",updateFrequency:"On request (cached)",updateIntervalSec:3600,processing:"Documented, transparent rules; see the methods section.",license:"Not applicable (computed by this app)",licenseVerified:!0,auth:"None",limitations:["Never an official warning."]}}])}],41790,(e,t,a)=>{!function(){"use strict";var e={431:function(e){function t(e){if("string"!=typeof e)throw TypeError("Path must be a string. Received "+JSON.stringify(e))}function a(e,t){for(var a,i="",r=0,o=-1,n=0,s=0;s<=e.length;++s){if(s<e.length)a=e.charCodeAt(s);else if(47===a)break;else a=47;if(47===a){if(o===s-1||1===n);else if(o!==s-1&&2===n){if(i.length<2||2!==r||46!==i.charCodeAt(i.length-1)||46!==i.charCodeAt(i.length-2)){if(i.length>2){var l=i.lastIndexOf("/");if(l!==i.length-1){-1===l?(i="",r=0):r=(i=i.slice(0,l)).length-1-i.lastIndexOf("/"),o=s,n=0;continue}}else if(2===i.length||1===i.length){i="",r=0,o=s,n=0;continue}}t&&(i.length>0?i+="/..":i="..",r=2)}else i.length>0?i+="/"+e.slice(o+1,s):i=e.slice(o+1,s),r=s-o-1;o=s,n=0}else 46===a&&-1!==n?++n:n=-1}return i}var i={resolve:function(){for(var e,i,r="",o=!1,n=arguments.length-1;n>=-1&&!o;n--)n>=0?i=arguments[n]:(void 0===e&&(e=""),i=e),t(i),0!==i.length&&(r=i+"/"+r,o=47===i.charCodeAt(0));if(r=a(r,!o),o)if(r.length>0)return"/"+r;else return"/";return r.length>0?r:"."},normalize:function(e){if(t(e),0===e.length)return".";var i=47===e.charCodeAt(0),r=47===e.charCodeAt(e.length-1);return(0!==(e=a(e,!i)).length||i||(e="."),e.length>0&&r&&(e+="/"),i)?"/"+e:e},isAbsolute:function(e){return t(e),e.length>0&&47===e.charCodeAt(0)},join:function(){if(0==arguments.length)return".";for(var e,a=0;a<arguments.length;++a){var r=arguments[a];t(r),r.length>0&&(void 0===e?e=r:e+="/"+r)}return void 0===e?".":i.normalize(e)},relative:function(e,a){if(t(e),t(a),e===a||(e=i.resolve(e))===(a=i.resolve(a)))return"";for(var r=1;r<e.length&&47===e.charCodeAt(r);++r);for(var o=e.length,n=o-r,s=1;s<a.length&&47===a.charCodeAt(s);++s);for(var l=a.length-s,d=n<l?n:l,c=-1,p=0;p<=d;++p){if(p===d){if(l>d){if(47===a.charCodeAt(s+p))return a.slice(s+p+1);else if(0===p)return a.slice(s+p)}else n>d&&(47===e.charCodeAt(r+p)?c=p:0===p&&(c=0));break}var u=e.charCodeAt(r+p);if(u!==a.charCodeAt(s+p))break;47===u&&(c=p)}var m="";for(p=r+c+1;p<=o;++p)(p===o||47===e.charCodeAt(p))&&(0===m.length?m+="..":m+="/..");return m.length>0?m+a.slice(s+c):(s+=c,47===a.charCodeAt(s)&&++s,a.slice(s))},_makeLong:function(e){return e},dirname:function(e){if(t(e),0===e.length)return".";for(var a=e.charCodeAt(0),i=47===a,r=-1,o=!0,n=e.length-1;n>=1;--n)if(47===(a=e.charCodeAt(n))){if(!o){r=n;break}}else o=!1;return -1===r?i?"/":".":i&&1===r?"//":e.slice(0,r)},basename:function(e,a){if(void 0!==a&&"string"!=typeof a)throw TypeError('"ext" argument must be a string');t(e);var i,r=0,o=-1,n=!0;if(void 0!==a&&a.length>0&&a.length<=e.length){if(a.length===e.length&&a===e)return"";var s=a.length-1,l=-1;for(i=e.length-1;i>=0;--i){var d=e.charCodeAt(i);if(47===d){if(!n){r=i+1;break}}else -1===l&&(n=!1,l=i+1),s>=0&&(d===a.charCodeAt(s)?-1==--s&&(o=i):(s=-1,o=l))}return r===o?o=l:-1===o&&(o=e.length),e.slice(r,o)}for(i=e.length-1;i>=0;--i)if(47===e.charCodeAt(i)){if(!n){r=i+1;break}}else -1===o&&(n=!1,o=i+1);return -1===o?"":e.slice(r,o)},extname:function(e){t(e);for(var a=-1,i=0,r=-1,o=!0,n=0,s=e.length-1;s>=0;--s){var l=e.charCodeAt(s);if(47===l){if(!o){i=s+1;break}continue}-1===r&&(o=!1,r=s+1),46===l?-1===a?a=s:1!==n&&(n=1):-1!==a&&(n=-1)}return -1===a||-1===r||0===n||1===n&&a===r-1&&a===i+1?"":e.slice(a,r)},format:function(e){var t,a;if(null===e||"object"!=typeof e)throw TypeError('The "pathObject" argument must be of type Object. Received type '+typeof e);return t=e.dir||e.root,a=e.base||(e.name||"")+(e.ext||""),t?t===e.root?t+a:t+"/"+a:a},parse:function(e){t(e);var a,i={root:"",dir:"",base:"",ext:"",name:""};if(0===e.length)return i;var r=e.charCodeAt(0),o=47===r;o?(i.root="/",a=1):a=0;for(var n=-1,s=0,l=-1,d=!0,c=e.length-1,p=0;c>=a;--c){if(47===(r=e.charCodeAt(c))){if(!d){s=c+1;break}continue}-1===l&&(d=!1,l=c+1),46===r?-1===n?n=c:1!==p&&(p=1):-1!==n&&(p=-1)}return -1===n||-1===l||0===p||1===p&&n===l-1&&n===s+1?-1!==l&&(0===s&&o?i.base=i.name=e.slice(1,l):i.base=i.name=e.slice(s,l)):(0===s&&o?(i.name=e.slice(1,n),i.base=e.slice(1,l)):(i.name=e.slice(s,n),i.base=e.slice(s,l)),i.ext=e.slice(n,l)),s>0?i.dir=e.slice(0,s-1):o&&(i.dir="/"),i},sep:"/",delimiter:":",win32:null,posix:null};i.posix=i,e.exports=i}},a={};function i(t){var r=a[t];if(void 0!==r)return r.exports;var o=a[t]={exports:{}},n=!0;try{e[t](o,o.exports,i),n=!1}finally{n&&delete a[t]}return o.exports}i.ab="/ROOT/node_modules/next/dist/compiled/path-browserify/",t.exports=i(431)}()}]);