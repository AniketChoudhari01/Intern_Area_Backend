// filepath: /C:/Users/iaman/OneDrive/Desktop/projectNull/internshala-/backend/middlewares/error-middleware.js
const errorMiddleware = (err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || "Backend Error";
  const extraDetails = err.extraDetails || "Error from the Backend";

  console.error(
    `[${req.method}]  ${req.path} >> StatusCode:: ${status}, Message:: ${message}, ExtraDetails:: ${extraDetails}, Stack:: ${err.stack}`
  );

  return res.status(status).json({ message, extraDetails });
};

module.exports = errorMiddleware;