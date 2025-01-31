const Model = require("../../models/index");
const Validation = require("../../utils/validations/validation");
const Message = require("../../Message");
const Services = require("../../services");
const otpService = require("../../services/OtpService");
const Status = require("../../status");
const HTTPError = require("../../utils/CustomError");
const moment = require("moment");
const catchAsync = require("../../utils/catchAsync");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const validatePassword = require("../../utils/validatePassword");
const cloudUpload = require("../../cloudinary");
module.exports = {
  accountVerificationUser: catchAsync(async (req, res, next) => {
    const { otp } = req.body;
    if (!otp) throw new HTTPError(Status.BAD_REQUEST, Message.required);

    const now = moment().valueOf();
    let user;
    if (otp) {
      user = await Model.User.findOne({ otp: otp });
    } else {
      throw new HTTPError(Status.BAD_REQUEST, "otp is required");
    }

    if (!user) throw new HTTPError(Status.BAD_REQUEST, Message.userNotFound);
    else if (user.otpExpiry < now)
      throw new HTTPError(Status.BAD_REQUEST, "OTP expired");
    else if (user.isEmailConfirmed)
      throw new HTTPError(Status.BAD_REQUEST, "Account already verified");
    else if (parseInt(user.otp) !== parseInt(otp))
      throw new HTTPError(Status.BAD_REQUEST, "Invalid OTP");

    let userData = {};
    if (otp) {
      await Model.User.findOneAndUpdate(
        { otp: otp },
        { $set: { isEmailConfirmed: true }, $unset: { otp: 1, otpExpiry: 1 } }
      );
    }

    userData = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      ...userData,
    };
    return res.ok("Account verified successfully", userData);
  }),
  //resend otp to email
  resendUserOtp: catchAsync(async (req, res, next) => {
    const { email } = req.body;
    if (!email) throw new HTTPError(Status.BAD_REQUEST, Message.required);
    if (!Validation.validateEmail(email)) {
      return res.badRequest("Invalid email format");
    }
    const otp = otpService.issue();
    const otpExpiryCode = moment().add(10, "minutes").valueOf();
    if (email) {
      await Model.User.findOneAndUpdate(
        { email: email },
        { $set: { otp: otp, otpExpiry: otpExpiryCode } }
      );
    }
    // const token =  Services.JwtService.issue({
    //   id: Services.HashService.encrypt(user._id),
    // })
    // console.log(token)
    // Construct the email message with the OTP
    const emailMessage = `Thank you for registering with We Have And You Have!\n\nYour verification code is: ${otp}`;
    // await Services.EmailService.sendEmail(
    //   emailMessage,
    //   otp,
    //   email,
    //   "Reset otp "
    // );
    // Send the email with the message directly
    await Services.EmailService.sendEmail(
      emailMessage,
      email,
      "User Account Email Verification"
    );
    return res.ok("Reset otp has been sent to your registered email.");
  }),

  forgetUserPassword: catchAsync(async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
      return res.badRequest(Message.badRequest);
    }

    try {
      let user = await Model.User.findOne({ email });

      if (!user) {
        throw new HTTPError(Status.BAD_REQUEST, Message.userNotFound);
      }

      // Generate a random temporary password
      const temporaryPassword = generateRandomPassword();

      // Update user's password with the temporary password
      user.password =   temporaryPassword;

      // Generate a unique token for password reset
      const resetToken = crypto.randomBytes(20).toString("hex");

      // Set the reset token and its expiry in the user document
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = Date.now() + 600000; // Token expires in 10 minutes

      // Save the user document with the reset token and temporary password
      await user.save();

      const emailBody = `
        Dear User,

        Temporary Password: ${temporaryPassword}

        This temporary password will be valid until you reset your password.

        Regards,
        Your App Team`;

      await Services.EmailService.sendEmail(
        emailBody,
        "Change Password Link and Temporary Password",
        email
      );

      return res.ok("Reset link and temporary password have been sent to your registered email.");
    } catch (error) {
      // Handle errors
      if (error instanceof HTTPError) {
        return res.status(error.status).send(error.message);
      }
      console.error(error); // Log other unexpected errors for debugging
      return res.status(Status.INTERNAL_SERVER_ERROR).send(Message.serverError);
    }
  }),
  updateUserPassword: catchAsync(async (req, res, next) => {
    const { newPassword } = req.body;
    const { token } = req.query;
    if (!newPassword)
      return res.status(400).json({
        success: false,
        message: Message.badRequest,
        data: null,
      });
    let user;
    user = await Model.User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }, // Check if the token is not expired
    });
    //User not found
    if (!user) throw new HTTPError(Status.NOT_FOUND, Message.userNotFound);
    if (user) {
    }
    if (
      !validatePassword({
        password: newPassword,
      })
    )
      return res.status(400).json({
        success: false,
        message: Message.passwordTooWeak,
        data: null,
      });
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);

    // Update the user's password in the database
    await Model.User.findOneAndUpdate(
      { _id: user._id },
      {
        $set: {
          password: hash,
        },
        $unset: {
          // resetPasswordToken: 1,
          otp: 1,
          otpExpiry: 1,
          // resetPasswordExpires: 1,
        },
      }
    );

    return res.ok("Password has been successfully reset.");
  }),

  changeUserPassword: catchAsync(async (req, res, next) => {
    try {
      // Get authenticated user
      const verifiedUser = req.user;
      const { currentPassword, newPassword } = req.body;

      // Validate input
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: Message.required,
          data: null,
        });
      }

      // Find User user
      let user = await Model.User.findOne({ _id: verifiedUser._id });

      // Handle user not found
      if (!user) {
        throw new HTTPError(Status.NOT_FOUND, Message.userNotFound);
      }

      // Compare current password with hashed password
      const match = await bcrypt.compare(currentPassword, user.password);

      if (match) {
        // Generate salt and hash new password
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);

        // Update user password in the database
        await Model.User.findOneAndUpdate(
          { _id: user._id },
          { $set: { password: hash } }
        );

        // Respond with success message and updated user
        user = { ...user._doc };
        return res.ok("Password updated successfully", user);
      } else {
        // Incorrect credentials
        return res.badRequest("Invalid Credentials");
      }
    } catch (error) {
      // Handle any unexpected errors
      next(error);
    }
  }),

  registerUser: catchAsync(async (req, res, next) => {
    try {
      const { firstName, lastName, email, password } = req.body;
      // Email validation
      if (!Validation.validateEmail(email)) {
        return res.badRequest("Invalid email format");
      }
      let role = "User"; // Set a default role if the condition is not met

      const isValidate = await validatePassword({ password });
      if (!isValidate) return res.badRequest(Message.passwordTooWeak);
      const hash = bcrypt.hashSync(password, 10);
      const otp = otpService.issue();
      const otpExpiry = moment().add(10, "minutes").valueOf();
      const verifyEmail = await Model.User.findOne({ email });
      if (verifyEmail)
        throw new HTTPError(Status.BAD_REQUEST, Message.emailAlreadyExists);
      const User = new Model.User({
        firstName,
        lastName,
        email,
        role,
        otp: otp,
        otpExpiry: otpExpiry,
        password: hash,
      });
     await User.save()   
      const emailMessage = `Thank you for registering with We Have And You Have!.\n\nYour verification code is: ${otp}`;

      // Send the email with the message directly
      await Services.EmailService.sendEmail(
        emailMessage,
        email,
        "User Account Email Verification"
      );

      return res.ok("User Registered successfully.", User);
    } catch (err) {
      next(err);
    }
  }),
  loginUser: catchAsync(async (req, res, next) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        throw new HTTPError(Status.BAD_REQUEST, Message.required);
      }

      if (!Validation.validateEmail(email)) {
        return res.badRequest("Invalid email format");
      }

      let user = await Model.User.findOne({ email });

      if (!user) {
        throw new HTTPError(Status.NOT_FOUND, Message.userNotFound);
      }
      if (!user.isEmailConfirmed) {
        return res.badRequest(
          "Email not confirmed. Please confirm your email via otp."
        );
      }
      const newFieldValue = "new value";
      const match = await bcrypt.compare(password, user.password);

      if (match) {
        await Model.User.findOneAndUpdate(
          { _id: user._id },
          { $set: { fieldName: newFieldValue } }
        );
        // const token = Services.JwtService.issue({
        //   id: Services.HashService.encrypt(user._id),
        // });
        const token = `GHA ${Services.JwtService.issue({
          id: Services.HashService.encrypt(user._id),
          role: Services.HashService.encrypt(user.role),
        })}`;

        return res.ok("Log in successfully", {
          token,
          user,
        });
      } else {
        return res.badRequest("Invalid Credentials");
      }
    } catch (err) {
      console.error(err);
      next(err);
    }
  }),
  uploadUserProfilePic: catchAsync(async (req, res, next) => {
    const userData = req.body;
    const userId=req.user._id
    try {
      if (req.files.profilePic) {
        const file = req.files.profilePic[0]; // Assuming you only want to handle one profile picture
        const { path } = file;

        // Upload the file to Cloudinary
        var cloudinaryResult = await cloudUpload.cloudinaryUpload(path);
      }
      // Fetch the user
      const user = await Model.User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const result = await Model.User.findByIdAndUpdate(
        { _id: userId },
        {
          profilePic: cloudinaryResult,
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          phoneNumber: userData.phoneNumber,
          bio: userData.bio,
          address: userData.address,
        },
        { new: true, runValidators: true }
      );
      if (!result) {
        console.log("User not found");
        throw new HTTPError(Status.NOT_FOUND, "User not found");
      }

      const message = " Data updated successfully";
      console.log(message);
      res.ok(message, result);
    }
    catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }),
  getAllUsers: catchAsync(async (req, res, next) => {
    console.log("Fetching customers is called");
    try {
      const pageNumber = parseInt(req.query.pageNumber) || 0;
      const limit = parseInt(req.query.limit) || 10;

      if (isNaN(pageNumber) || isNaN(limit) || pageNumber < 0 || limit < 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid query parameters",
        });
      }

      const message = "Customers found successfully";

      const skipValue = pageNumber * limit - limit;
      if (skipValue < 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid combination of pageNumber and limit.",
        });
      }

      // Aggregation pipeline to get only customers where isDeleted is false
      const Customers = await Model.User.aggregate([
        { $match: { isDeleted: false } },
        { $skip: skipValue },
        { $sort: { createdAt: -1 } },
        { $limit: limit },
        // Add any additional stages or lookups you need here
      ]);

      const CustomerSize = await Model.User.countDocuments({
        isDeleted: false,
      });

      const result = {
        Customers: Customers,
        totalCustomers: CustomerSize,
        limit: limit,
      };

      if (CustomerSize === 0) {
        return res.status(404).json({
          success: false,
          message: "Customers do not exist.",
        });
      }

      return res.status(200).json({
        success: true,
        data: result,
        message: message,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }),

  // Update a User with a particular ID
  updateUser: catchAsync(async (req, res, next) => {
    const userId = req.params.id;
    const updateData = req.body; // Assuming the request body contains the updated data

    try {
      const updatedUser = await Model.User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        return res.badRequest("User Not Found in our records");
      }

      const message = "User updated successfully";
      res.ok(message, updatedUser);
    } catch (err) {
      throw new HTTPError(Status.INTERNAL_SERVER_ERROR, err);
    }
  }),
  // Retrieve a single User with a particular ID
  getSingleUser: catchAsync(async (req, res, next) => {
    const userId = req.user._id; // Assuming the user_id is stored in the _id field of the user object
    console.log(userId, "userId");
    try {
      const user = await Model.User.findById(userId)
        .select("-password") // Exclude the password field
        // .populate("address");

      if (!user) {
        return res.badRequest("User Not Found in our records");
      }

      res.ok("User retrieved successfully", user);
    } catch (err) {
      throw new HTTPError(Status.INTERNAL_SERVER_ERROR, err);
    }
  }),
  // Delete a single User with a particular ID
  // Delete or Temporarily Mark a User based on a condition
  deleteUser: catchAsync(async (req, res, next) => {
    const userId = req.params.id;
    const { permanent } = req.query; // Assuming the query parameter "permanent" is used to determine the delete type

    try {
      let user;

      if (permanent === "true") {
        // Delete permanently based on the condition
        user = await Model.User.findByIdAndDelete(userId);
      } else {
        // Mark as temporarily deleted (update a field, e.g., isDeleted)
        user = await Model.User.findByIdAndUpdate(
          userId,
          { isDeleted: true },
          { new: true, runValidators: true }
        );
      }

      if (!user) {
        return res.badRequest("User Not Found in our records");
      }

      res.ok(
        permanent === "true"
          ? "User deleted permanently"
          : "User marked as temporarily deleted",
        user
      );
    } catch (err) {
      throw new HTTPError(Status.INTERNAL_SERVER_ERROR, err);
    }
  }),
};
// Function to generate a random temporary password
function generateRandomPassword() {
  const requiredLength = 7; // We want the random part to be 7 characters long
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let randomPart = "";
  for (let i = 0; i < requiredLength; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    randomPart += charset[randomIndex];
  }
  const password = randomPart + '$'; // Append '$' to the random part
  return password;
}
