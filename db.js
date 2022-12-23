const Entry = require('./models/Post'); // 🟠 When the database is rebuilt, change to models/Entry
const User = require('./models/User');

// * === ▶︎ move this admin controls
const limit = 7;

// * === returns archive date hierarchy in the sidebar
const getArchive = async () => {
  const _now = new Date();
  
  return await Entry
    .find(
      { publish: true, pubDate: { $lt: _now } },
      { title: 1, slug: 1, pubDate: 1, _id: 0 })
    .sort({ pubDate: -1 })
    .lean();
}

// * === returns Topics section in the sidebar
const getCategories = async () => {
  const _now = new Date();

  return await Entry
    .find(
      { publish: true, pubDate: { $lt: _now } },
      { _id: 1, tags: 1 })
    .lean();
}

// * === returns ˙number of entries by topic or without topic
const getEntryCount = async (topic) => {  const _now = new Date();
  const filterByTag = topic ? { tags: topic } : {};

  return await Entry.countDocuments({ $and: [
    { publish: true },
    { pubDate: { $lt: _now }},
    filterByTag
  ] });
}

// * === returns Next/previoius navigation in the reader
const getAdjacents = async (date) => {

  const next = await Entry
    .find({ publish: true, pubDate: { $gt: date } })
    .lean()
    .sort({ pubDate:  1 })
    .limit(1);

  const prev = await Entry
    .find({ publish: true, pubDate: { $lt: date } })
    .lean()
    .sort({ pubDate: -1 })
    .limit(1);

  return { next: next[0], prev: prev[0] }; 
}

// * === returns limited number of entries to populate list cards
const getListOfEntriesByDate = async (skip) => {
  const _now = new Date();
  
  return await Entry
    .find({ $and: [
      { publish: true },
      { pubDate: {$lt: _now }}
    ]})
    .lean()
    .sort({ pubDate: -1 })
    .skip(skip)
    .limit(limit);
}

// * === returns unlimited entries by topic to populate list cards
const getListOfEntriesByCategory = async (tag, skip) => {
  const _now = new Date();

  return await Entry
    .find({ tags: tag, publish: true , pubDate: { $lt: _now } }) 
    .lean()
    .sort({ pubDate: -1 })
    .skip(skip)
    .limit(limit);
}

// * === returns unlimited entries where publish is false to populate list cards
const getListOfUnpublishedEntries = async () => {
  return await Entry
    .find({ publish: false })
    .lean()
    .sort({ _id: -1 });
}

// * === returns one entry for reader or editor
const getOneEntry = async (slug, _id ) => {
  const filter = slug ? { slug } : { _id };
  return await Entry.findOne( filter ).lean();
}

// * === adds new entries or saves changes to exising
const addOrUpdateEntry = async (entry) => {
  return await Entry.findOneAndUpdate(
    entry.id ? { _id: entry.id } : {},
    entry,
    { new: true, upsert: true }
  );
}



module.exports = {
  getArchive,
  getCategories,
  getAdjacents,
  getEntryCount,
  getListOfEntriesByDate,
  getListOfEntriesByCategory,
  getListOfUnpublishedEntries,
  getOneEntry,
  addOrUpdateEntry,
 };