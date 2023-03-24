const mongo = require("mongodb");
const { isObjectIdOrHexString, default: mongoose } = require("mongoose");
const Entry = require('./models/Post'); // 🟠 When the database is rebuilt, change to models/Entry
const User = require('./models/User');
const { limit, logError } = require("./util");

// * === ERROR CONTENT
const errMsg = {
  begin: "An error occurred when accessing ",
  end: "It is logged for review. Apologies for any inconvenience.",
  noResults: "There were no entries found using your request.",
  pagination: `<strong class="warning">&#9888; Pagination error.</strong> Try the Archive.`,
  contact: `Contact your admin right away.`,
}


/*
====================================================
        NAVIGATION AND SIDEBAR
====================================================
*/
// * === RETURNS DATE HEIRARCHY FOR SIDEBAR
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


// * === RETURNS LIST OF TOPICS FOR SIDEBAR
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


// * === RETURNS NUMBER OF ENTRIES BY TOPIC FOR SIDEBAR
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


// * === RETURNS NEXT/PREVIOUS NAVIGATION LINKS FOR READER
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


/*
====================================================
        USERS
====================================================
*/
// * === RETRIEVE A USER
const getUser = async _id => {
  try {
    return await User
      .find({_id})
      .select( '-_id -password -email -__v' )
      .lean();
  } catch (err) {
    // todo: add logging
    return {
      error: true,
      message: `User not found.`
    };
  }
}


// * === ADD A NEW USER
const createUser = async user => {
  try {
    const newUser = await await User.create(user).save();
  } catch(err) {
    // todo: add logging
    return {
      error: true,
      message: 'User not saved.'
    };
  }
}


// * === UPDATE USER
const saveUser = async user => {
//   try {
//     const newUser = await User.findOneAndUpdate(
//       user.id ? { _id: user.id } : {},
//       user,
//       { new: true, upsert: true }
//     );
//     console.log("🟢", newuser); // 🔴
//     return newUser;
//   } catch (err) {
//     // todo: add logging
//     return {
//       error: true,
//       message: 'User not saved.'
//     }
//   }
}


/* 
====================================================
         ENTRIES
====================================================
*/
// * === RETURNS LIMITED ENTRIES BY DATE FOR LIST
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


// * === RETURNS ALL ENTRIES BY TOPIC FOR LIST
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


// * === RETURNS ALL UNPUBLISHED ENTRIES FOR LIST
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


// * === RETURNS AN ENTRY FOR READER OR EDITOR
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


// * === UPDATE EXISTING ENTRY
const updateEntry = async entry => { 
  try {
    await Entry.updateOne(
      { _id: entry.id },
      entry
    );
    return {
      error: false,
      message: "Entry data successfully saved to the database."
    };
  } catch(err){
    // todo: add logging
    return {
      error: true,
      message: `${errMsg.begin} the editor's entry saving process. ${errMsg.contact} ${errMsg.end}`,
      sysmessage: err
    }
  }
}


// * === ADD NEW ENTRY
const saveEntry = async entry => {
  try {
    const result = await Entry.create(entry);
    return result;
  } catch(err) {
    // todo: add logging
    return {
      error: true,
      message: `${errMsg.begin} the editor's entry saving process. ${errMsg.contact} ${errMsg.end}`
    }
  }
}


// * === PERMANENTLY DELETE AN ENTRY; NO BACKSIES
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


module.exports = {
  getArchive,
  getCategories,
  getAdjacents,
  getEntryCount,
  createUser,
  getUser,
  saveUser,
  getListOfEntriesByDate,
  getListOfEntriesByCategory,
  getListOfUnpublishedEntries,
  getOneEntry,
  updateEntry,
  saveEntry,
  deleteOneEntry,
 };