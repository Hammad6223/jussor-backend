var Model = require("../models/index");

module.exports = {
    // Job seeker Pin
    createContent: async (data) => {
        console.log("createContentHelperFunction is called");
        const Content = new Model.Content(data);
        await Content.save();
        return Content;
    },

    findContentById: async (ContentId) => {
        console.log("findPinById HelperFunction is called", ContentId);

        const Content = await Model.Content.findOne({_id:ContentId})
        .populate({
            path: "categoryAndSubCategory.category",
            model: "Category",
            select: "_id categoryName",
          })
          .populate({
            path: "categoryAndSubCategory.subcategory",
            model: "Category",
            select: "_id categoryName",
          });
        return Content;
    }
};
