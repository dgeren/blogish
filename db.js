const mongo = require("mongodb");
const { isObjectIdOrHexString, default: mongoose } = require("mongoose");
const Entry = require('./models/Post'); // 🟠 When the database is rebuilt, change to models/Entry
const User = require('./models/User');
const { limit, logError } = require("./util");

// * === error content
const errMsg = {
  begin: "An error occurred when accessing ",
  end: "It is logged for review. Apologies for any inconvenience.",
  noResults: "There were no entries found using your request.",
  pagination: `<strong class="warning">&#9888; Pagination error.</strong> Try the Archive.`,
  contact: `Contact your admin right away.`,
}

// * === returns archive date hierarchy in the sidebar
const getArchive = async (user) => {
  const _now = new Date();
  const filter = user ? { pubDate: {$ne: null } } : { publish: true, pubDate: { $lt: _now } };
  let result;
  
  try {
    result = await Entry
      .find(
        filter,
        { title: 1, slug: 1, pubDate: 1 })
      .sort({ pubDate: -1 })
      .lean();
    if(result.length === 0) throw { results: false };
  } catch (err) {
    // todo: add logging
    result = {
      error: true,
      message: `${errMsg.begin} the archive data. ${errMsg.end}`
    };
    console.log(err); // 🟠
  } finally {
    return result;
  }
}

// * === returns Topics section in the sidebar
const getCategories = async (user) => {
  const _now = new Date();
  const filter = user ? {} : { publish: true, pubDate: { $lt: _now } };
  let result;

  try {
    result = await Entry
      .find(
        filter,
        { _id: 0, tags: 1 })
      .lean();
    if(result.length === 0) throw { results: false };
  } catch (err) {
    // todo: add logging
    result = {
      error: true,
      message: `${errMsg.begin} the topics data. ${errMsg.end}`
    }
  } finally {
    return result;
  }

    
}

// * === returns ˙number of entries by topic or without topic
const getEntryCount = async (topic, user) => {
  const _now = new Date();
  const filterByTag = topic ? { tags: topic } : {};
  const filterByUser = user ? {} : { publish: true, pubDate: { $lt: _now } };
  let result;
  
  try {
    result = await Entry.countDocuments({ $and: [ filterByUser, filterByTag ] });
    if(result === 0) throw { results: false };
  } catch (err) {
    // todo: add logging
    result = {
      error: true,
      message: errMsg.pagination,
    };
  }
  return result;
}

// * === returns Next/previoius navigation in the reader
const getAdjacents = async (date, user) => { // ! May be origin of unpub pagination error
  let next, prev;
  let filterNext = { publish: true };
  let filterPrev = { publish: true };
  if(!user) {
    filterNext.pubDate = { $gt: date };
    filterPrev.pubDate = { $lt: date };
  }
  
  try{
    next = await Entry
      .find(
        filterNext,
        { slug: 1, title: 1 })
      .lean()
      .sort({ pubDate:  1 })
      .limit(1);

    prev = await Entry
    .find(
      filterPrev,
      { slug: 1, title: 1 })
    .lean()
    .sort({ pubDate: -1 })
    .limit(1);

    if(next.error || prev.error) throw { results: false };

    return { next: next[0], prev: prev[0] };
    
  } catch(err) {
    // todo: add logging
    return {
      error: true,
      message: errMsg.pagination,
    }
  }
}

// * === returns limited number of entries to populate list cards
const getListOfEntriesByDate = async (skip, user) => {
  const _now = new Date();
  const filter = user ? {} : { publish: true, pubDate: { $lt: _now } };
  
  let result;
  
  try {
    result = await Entry
      .find(filter)
      .sort({ pubDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    if(result.length === 0) throw { results: 0 };
    return result;

  } catch(err) {
    // todo: add logging
    if(results = 0) {
      result = [{
        error: true,
        message: errMsg.noResults
      }];
      return result;
    }
    result = [{
      error: true,
      message: `${errMsg.begin} the list of entries. ${errMsg.end}`,
    }];
  }
  return result;
}

// * === returns unlimited entries by topic to populate list cards
const getListOfEntriesByCategory = async (topic, user) => {
  const _now = new Date();
  const filter = user ? { tags: topic } : { tags: topic, publish: true , pubDate: { $lt: _now } };
  let result;

  try {
    result = await Entry
      .find(filter)
      .sort({ pubDate: -1 })
      .lean();
    if(result.length === 0 || result === null) throw { results: 0 }; 

    return result;
  } catch (err) {
    // todo: add logging
    if(err === 0) {
      result = [{
        error: true,
        message: `${errMsg.begin} the topic requested. ${errMsg.end}`,
      }];
      return result;
    }
    result = [{
      error: true,
      message: `${errMsg.begin} the list of entries by topic. ${errMsg.end}`,
    }];
  }
  return result;
}

// * === returns unlimited entries where publish is false to populate list cards
const getListOfUnpublishedEntries = async () => {
  let result;

  try {
    result = await Entry
      .find({ $or: [ {publish: false }, { pubDate: null } ] })
      .lean()
      .sort({ _id: -1 });
    if(result.length === 0) throw { results: 0 };
  } catch(err) {
    // todo: add logging
    if(err.results === 0){
      result = [{
        error: true,
        description: `There appear to be no unplubished entries. Cool! Or, ${errMsg.title} the list of unpublished entries. ${errMsg.contact} ${errMsg.end}`,
      }];
    }
    result = [{
      error: true,
      description: `${errMsg.begin} the entry you requested or the database. ${errMsg.contact} ${errMsg.end}`
    }];
  }
  return result;
}


// * === returns one entry for reader or editor
const getOneEntry = async (slug, _id) => {
  try {
    const filter = slug ? { slug } : { _id };
    const result = await Entry.findOne( filter ).lean();
    if(!result) throw { results: 0 };
    return result;
  } catch (err) {
    // todo: add logging
    return {
      error: true,
      message: errMsg.noResults
    }
  }
}

// * === adds new entries or saves changes to exising
const addOrUpdateEntry = async (entry) => {
  try {
    await Entry.findOneAndUpdate(
      entry.id ? { _id: entry.id } : {},
      entry,
      { new: true, upsert: true }
    );
    return {
      error: false,
      message: "Entry data successfully saved to the database."
    };
  } catch(err){
    // todo: add logging
    return {
      error: true,
      message: `${errMsg.begin} the editor's entry saving process. ${errMsg.contact} ${errMsg.end}`
    }
  }
}

const deleteOneEntry = async _id => {
  try {
    await Entry.findByIdAndDelete( _id );
    return {
      error: false,
      message: `Entry deleted. The action logged for review. Use [Upload] to create a new entry with a new ID.`
    };
  } catch (err) {
    // todo: add logging
    return {
      error: true,
      message: `${errMsg.begin} with deleting this entry. ${errMsg.contact} ${errMsg.end}`
    };
  }
}

const getUser = async _id => {
  try {
    await User
      .findById(_id)
      .select( '-password -creator' )
      .lean();
  } catch (err) {
    return {
      error: true,
      message: `User not found.`
    };
  }
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
  deleteOneEntry,
  getUser,
 };