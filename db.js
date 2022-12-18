const Entry = require('./models/Post'); // 🟠 When the database is rebuilt, change to models/Entry
const User = require('./models/User');

const limit = 7;

const getArchive = async () => {
  const _now = new Date();
  
  return await Entry
    .find(
      { publish: true, pubDate: { $lt: _now } },
      { title: 1, slug: 1, pubDate: 1, _id: 0 })
    .sort({ pubDate: -1 })
    .lean();
}

const getCategories = async () => {
  const _now = new Date();

  return await Entry
    .find(
      { publish: true, pubDate: { $lt: _now } },
      { _id: 1, tags: 1 })
    .lean();
}

const getAdjacents = async () => {

}

const getEntryCount = async () => {

}

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

const getListOfEntriesByCategory = async (tag, skip) => {
  const _now = new Date();

  return await Entry
    .find({ tags: tag, publish: true , pubDate: { $lt: _now } }) 
    .lean()
    .sort({ pubDate: -1 })
    .skip(skip)
    .limit(limit);
}

const getListOfUnpublishedEntries = async () => {
  const results = await Entry.find({ publish: false } ).lean(); // 🔴
  console.log(results); // 🔴
  
  
  return await Entry
    .find({ publish: false })
    .lean()
    .sort({ _id: -1 });
}

const getOneEntry = async ({ slug = null, _id = null }) => {
  return await Entry.findOne( slug || _id ).lean();
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

 };