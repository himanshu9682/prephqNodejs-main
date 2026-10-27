const swaggerJsdoc = require("swagger-jsdoc");

const okResponse = (description = "Success") => ({
  description,
  content: {
    "application/json": {
      schema: {
        type: "object"
      }
    }
  }
});

const errorResponse = (description = "Error") => ({
  description,
  content: {
    "application/json": {
      schema: {
        $ref: "#/components/schemas/ErrorResponse"
      }
    }
  }
});

const idParam = (name = "id", description = "ID") => ({
  in: "path",
  name,
  required: true,
  schema: {
    type: "integer"
  },
  description
});

const slugParam = (description = "Slug") => ({
  in: "path",
  name: "slug",
  required: true,
  schema: {
    type: "string"
  },
  description
});

const bearerSecurity = [
  {
    bearerAuth: []
  }
];

const optionalBearerSecurity = [
  {
    bearerAuth: []
  },
  {}
];

const jsonBody = (schema, examples) => ({
  required: true,
  content: {
    "application/json": {
      schema,
      ...(examples ? { examples } : {})
    }
  }
});

const multipartBody = (schema) => ({
  required: true,
  content: {
    "multipart/form-data": {
      schema
    }
  }
});

const pageSchema = {
  type: "object",
  required: ["post_title", "post_name", "category_name", "post_content"],
  properties: {
    post_title: {
      type: "string",
      example: "Introduction to JavaScript"
    },
    post_name: {
      type: "string",
      example: "introduction-to-javascript"
    },
    post_date: {
      type: "string",
      format: "date-time"
    },
    category_name: {
      type: "string",
      example: "JavaScript"
    },
    category_slug: {
      type: "string",
      example: "javascript"
    },
    post_content: {
      type: "string",
      example: "<p>Content goes here</p>"
    },
    featured_image: {
      type: "string",
      format: "binary"
    },
    author_image: {
      type: "string",
      format: "binary"
    },
    content_image: {
      type: "string",
      format: "binary"
    },
    author_name: {
      type: "string"
    },
    author_linkedin: {
      type: "string"
    },
    author_quote: {
      type: "string"
    },
    seo_title: {
      type: "string"
    },
    seo_focus_keyword: {
      type: "string"
    },
    seo_tags: {
      type: "string"
    },
    seo_desc: {
      type: "string"
    },
    description: {
      type: "string"
    }
  }
};

const pageCrudPaths = (basePath, tag, singular) => ({
  [basePath]: {
    get: {
      summary: `Get all ${tag.toLowerCase()}`,
      tags: [tag],
      responses: {
        200: okResponse(`${tag} fetched successfully`),
        500: errorResponse("Internal server error")
      }
    },
    post: {
      summary: `Create ${singular}`,
      tags: [tag],
      security: bearerSecurity,
      requestBody: multipartBody(pageSchema),
      responses: {
        201: okResponse(`${singular} created successfully`),
        400: errorResponse("Required fields missing"),
        401: errorResponse("Unauthorized"),
        500: errorResponse("Internal server error")
      }
    }
  },
  [`${basePath}/category/{slug}`]: {
    get: {
      summary: `Get ${tag.toLowerCase()} by category`,
      tags: [tag],
      parameters: [slugParam("Category slug")],
      responses: {
        200: okResponse(`${tag} fetched successfully`),
        404: errorResponse(`No ${tag.toLowerCase()} found`),
        500: errorResponse("Internal server error")
      }
    }
  },
  [`${basePath}/{id}`]: {
    get: {
      summary: `Get ${singular} by ID`,
      tags: [tag],
      parameters: [idParam("id", `${singular} ID`)],
      responses: {
        200: okResponse(`${singular} fetched successfully`),
        400: errorResponse(`Invalid ${singular} ID`),
        404: errorResponse(`${singular} not found`),
        500: errorResponse("Internal server error")
      }
    },
    put: {
      summary: `Update ${singular}`,
      tags: [tag],
      security: bearerSecurity,
      parameters: [idParam("id", `${singular} ID`)],
      requestBody: multipartBody(pageSchema),
      responses: {
        200: okResponse(`${singular} updated successfully`),
        400: errorResponse(`Invalid ${singular} ID or required fields missing`),
        401: errorResponse("Unauthorized"),
        404: errorResponse(`${singular} not found`),
        500: errorResponse("Internal server error")
      }
    },
    delete: {
      summary: `Delete ${singular}`,
      tags: [tag],
      security: bearerSecurity,
      parameters: [idParam("id", `${singular} ID`)],
      responses: {
        200: okResponse(`${singular} deleted successfully`),
        400: errorResponse(`Invalid ${singular} ID`),
        401: errorResponse("Unauthorized"),
        404: errorResponse(`${singular} not found`),
        500: errorResponse("Internal server error")
      }
    }
  },
  [`${basePath}/{id}/like`]: {
    post: {
      summary: `Like or dislike ${singular.toLowerCase()}`,
      tags: [tag],
      security: bearerSecurity,
      parameters: [idParam("id", `${singular} ID`)],
      requestBody: jsonBody(
        {
          $ref: "#/components/schemas/LikeDislikeRequest"
        },
        {
          like: {
            summary: "Like",
            value: {
              liked: true
            }
          },
          dislike: {
            summary: "Dislike",
            value: {
              liked: false
            }
          }
        }
      ),
      responses: {
        200: {
          description: "Success",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/LikeDislikeSuccessResponse"
              }
            }
          }
        },
        400: errorResponse(`Invalid ${singular} ID or liked value`),
        401: errorResponse("Unauthorized"),
        404: errorResponse(`${singular} not found`),
        500: errorResponse("Internal server error")
      }
    }
  }
});

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "PrepHQ APIs",
      version: "1.0.0",
      description: "API documentation for PrepHQ Node.js backend",
    },
    servers: [
      {
        url: "https://backend.prephq.theiotacademy.co/",
      },
    ],
    tags: [
      {
        name: "Health",
        description: "API health check"
      },
      {
        name: "Auth",
        description: "Authentication APIs"
      },
      {
        name: "User",
        description: "User profile APIs"
      },
      {
        name: "Admin",
        description: "Admin APIs"
      },
      {
        name: "Contact",
        description: "Contact and newsletter APIs"
      },
      {
        name: "Jobs",
        description: "Job related APIs"
      },
      {
        name: "Questions",
        description: "Question and testcase APIs"
      },
      {
        name: "Run",
        description: "Code execution APIs"
      },
      {
        name: "Submit",
        description: "Code submission APIs"
      },
      {
        name: "Blogs",
        description: "Blog related APIs"
      },
      {
        name: "Interviews",
        description: "Interview related APIs"
      },
      {
        name: "Projects",
        description: "Project related APIs"
      },
      {
        name: "Tutorials",
        description: "Tutorial related APIs"
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            status: {
              type: "integer",
              example: 0
            },
            error: {
              type: "string",
              example: "Error message"
            }
          }
        },
        RegisterRequest: {
          type: "object",
          required: ["name", "lastname", "username", "email", "password"],
          properties: {
            name: {
              type: "string",
              example: "Rahul"
            },
            lastname: {
              type: "string",
              example: "Sharma"
            },
            username: {
              type: "string",
              example: "rahul123"
            },
            email: {
              type: "string",
              format: "email",
              example: "rahul@example.com"
            },
            password: {
              type: "string",
              format: "password",
              example: "Password@123"
            }
          }
        },
        LoginRequest: {
          type: "object",
          required: ["password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "rahul@example.com"
            },
            username: {
              type: "string",
              example: "rahul123"
            },
            password: {
              type: "string",
              format: "password",
              example: "Password@123"
            }
          }
        },
        LikeDislikeRequest: {
          type: "object",
          required: ["liked"],
          properties: {
            liked: {
              type: "boolean",
              example: true,
              description: "Use true to increase likes by 1 and false to decrease likes by 1"
            }
          }
        },
        LikeDislikeSuccessResponse: {
          type: "object",
          properties: {
            status: {
              type: "integer",
              example: 1
            },
            message: {
              type: "string",
              example: "Success"
            },
            likes: {
              type: "integer",
              example: 10
            }
          }
        },
        QuestionRequest: {
          type: "object",
          required: [
            "title",
            "slug",
            "difficulty",
            "domain",
            "topics",
            "description",
            "examples",
            "constraints_list",
            "starter_code",
            "testcases"
          ],
          properties: {
            title: {
              type: "string"
            },
            slug: {
              type: "string"
            },
            difficulty: {
              type: "string",
              enum: ["Easy", "Medium", "Hard"]
            },
            domain: {
              type: "string"
            },
            topics: {
              type: "array",
              items: {
                type: "string"
              }
            },
            description: {
              type: "string"
            },
            examples: {
              type: "array",
              items: {
                type: "object"
              }
            },
            constraints_list: {
              type: "array",
              items: {
                type: "string"
              }
            },
            starter_code: {
              type: "object"
            },
            status: {
              type: "string",
              enum: ["active", "inactive"]
            },
            entry_point: {
              type: "string",
              example: "twoSum"
            },
            param_order: {
              type: "array",
              items: {
                type: "string"
              },
              example: ["nums", "target"]
            },
            testcases: {
              type: "array",
              items: {
                type: "object"
              }
            }
          }
        },
        RunRequest: {
          type: "object",
          required: ["code", "entry_point", "param_order", "testcases"],
          properties: {
            code: {
              type: "string"
            },
            language: {
              type: "string",
              example: "javascript"
            },
            timeoutMs: {
              type: "integer",
              example: 5000
            },
            entry_point: {
              type: "string",
              example: "twoSum"
            },
            param_order: {
              type: "array",
              items: {
                type: "string"
              },
              example: ["nums", "target"]
            },
            testcases: {
              type: "array",
              items: {
                type: "object"
              }
            }
          }
        },
        SubmitRequest: {
          type: "object",
          required: ["code"],
          properties: {
            code: {
              type: "string"
            },
            language: {
              type: "string",
              example: "javascript"
            },
            timeoutMs: {
              type: "integer",
              example: 5000
            },
            question_id: {
              type: "integer",
              example: 1
            },
            slug: {
              type: "string",
              example: "two-sum"
            }
          }
        },
        JobRequest: {
          type: "object",
          required: ["title", "description", "company", "location", "jobType"],
          properties: {
            title: {
              type: "string"
            },
            description: {
              type: "string"
            },
            company: {
              type: "string"
            },
            location: {
              type: "string"
            },
            salary: {
              type: "string"
            },
            jobType: {
              type: "string"
            },
            requirements: {
              type: "string"
            },
            postedBy: {
              type: "string"
            }
          }
        }
      }
    },
    paths: {
      "/": {
        get: {
          summary: "API root",
          tags: ["Health"],
          responses: {
            200: {
              description: "API is running"
            }
          }
        }
      },
      "/health": {
        get: {
          summary: "API health check",
          tags: ["Health"],
          responses: {
            200: okResponse("API is running successfully")
          }
        }
      },
      "/register": {
        post: {
          summary: "Register user",
          tags: ["Auth"],
          requestBody: jsonBody({
            $ref: "#/components/schemas/RegisterRequest"
          }),
          responses: {
            200: okResponse("Registered successfully"),
            500: errorResponse("Internal server error")
          }
        }
      },
      "/loginUser": {
        post: {
          summary: "Login user",
          tags: ["Auth"],
          requestBody: jsonBody({
            $ref: "#/components/schemas/LoginRequest"
          }),
          responses: {
            200: okResponse("Login successful"),
            500: errorResponse("Internal server error")
          }
        }
      },
      "/request_reset": {
        post: {
          summary: "Request password reset",
          tags: ["Auth"],
          requestBody: jsonBody({
            type: "object",
            properties: {
              email: {
                type: "string",
                format: "email"
              },
              username: {
                type: "string"
              }
            }
          }),
          responses: {
            200: okResponse("Reset code sent to email"),
            500: errorResponse("Internal server error")
          }
        }
      },
      "/confirm": {
        post: {
          summary: "Confirm user account OTP",
          tags: ["Auth"],
          security: bearerSecurity,
          requestBody: jsonBody({
            type: "object",
            required: ["otp"],
            properties: {
              otp: {
                type: "string",
                example: "12345"
              }
            }
          }),
          responses: {
            200: okResponse("Account verified"),
            401: errorResponse("Unauthorized"),
            500: errorResponse("Internal server error")
          }
        }
      },
      "/resend-code": {
        post: {
          summary: "Resend confirmation code",
          tags: ["Auth"],
          security: bearerSecurity,
          responses: {
            200: okResponse("New code sent"),
            401: errorResponse("Unauthorized"),
            500: errorResponse("Internal server error")
          }
        }
      },
      "/verify_code": {
        post: {
          summary: "Verify password reset code",
          tags: ["Auth"],
          security: bearerSecurity,
          requestBody: jsonBody({
            type: "object",
            required: ["code"],
            properties: {
              code: {
                type: "string",
                example: "12345"
              }
            }
          }),
          responses: {
            200: okResponse("Code verified successfully"),
            401: errorResponse("Unauthorized"),
            500: errorResponse("Internal server error")
          }
        }
      },
      "/reset_password": {
        post: {
          summary: "Reset password",
          tags: ["Auth"],
          security: bearerSecurity,
          requestBody: jsonBody({
            type: "object",
            required: ["username", "new_password"],
            properties: {
              username: {
                type: "string"
              },
              new_password: {
                type: "string",
                format: "password"
              }
            }
          }),
          responses: {
            200: okResponse("Password reset successful"),
            401: errorResponse("Unauthorized"),
            500: errorResponse("Internal server error")
          }
        }
      },
      "/user": {
        get: {
          summary: "Get logged in user",
          tags: ["Auth"],
          security: bearerSecurity,
          responses: {
            200: okResponse("User retrieved successfully"),
            401: errorResponse("Unauthorized"),
            500: errorResponse("Internal server error")
          }
        }
      },
      "/profileupdate": {
        post: {
          summary: "Update user profile",
          tags: ["User"],
          security: bearerSecurity,
          requestBody: jsonBody({
            type: "object",
            properties: {
              name: { type: "string" },
              lastname: { type: "string" },
              email: { type: "string", format: "email" },
              username: { type: "string" },
              usertype: { type: "string" },
              countrycode: { type: "string" },
              phone: { type: "string" },
              city: { type: "string" },
              portfolio: { type: "string" },
              linkdin: { type: "string" },
              github: { type: "string" },
              codePen: { type: "string" }
            }
          }),
          responses: {
            200: okResponse("Profile updated successfully"),
            401: errorResponse("Unauthorized"),
            500: errorResponse("Internal server error")
          }
        }
      },
      "/upload-profile-image": {
        post: {
          summary: "Upload profile image",
          tags: ["User"],
          security: bearerSecurity,
          requestBody: multipartBody({
            type: "object",
            required: ["profile_image"],
            properties: {
              profile_image: {
                type: "string",
                format: "binary"
              }
            }
          }),
          responses: {
            200: okResponse("Profile image uploaded"),
            401: errorResponse("Unauthorized"),
            500: errorResponse("Internal server error")
          }
        }
      },
      "/upload-resume": {
        post: {
          summary: "Upload resume",
          tags: ["User"],
          security: bearerSecurity,
          requestBody: multipartBody({
            type: "object",
            required: ["resume"],
            properties: {
              resume: {
                type: "string",
                format: "binary"
              }
            }
          }),
          responses: {
            200: okResponse("Resume uploaded"),
            401: errorResponse("Unauthorized"),
            500: errorResponse("Internal server error")
          }
        }
      },
      "/delete-resume": {
        delete: {
          summary: "Delete resume",
          tags: ["User"],
          security: bearerSecurity,
          responses: {
            200: okResponse("Resume deleted successfully"),
            401: errorResponse("Unauthorized"),
            500: errorResponse("Internal server error")
          }
        }
      },
      "/get-user": {
        get: {
          summary: "Get user profile",
          tags: ["User"],
          security: bearerSecurity,
          responses: {
            200: okResponse("User fetched successfully"),
            401: errorResponse("Unauthorized"),
            500: errorResponse("Internal server error")
          }
        }
      },
      "/Admin-login": {
        post: {
          summary: "Admin login",
          tags: ["Admin"],
          requestBody: jsonBody({
            type: "object",
            required: ["password"],
            properties: {
              email: {
                type: "string",
                format: "email"
              },
              adminname: {
                type: "string"
              },
              password: {
                type: "string",
                format: "password"
              }
            }
          }),
          responses: {
            200: okResponse("Admin login successful"),
            401: errorResponse("Invalid credentials"),
            500: errorResponse("Internal server error")
          }
        }
      },
      "/Admin-logout": {
        post: {
          summary: "Admin logout",
          tags: ["Admin"],
          security: bearerSecurity,
          responses: {
            200: okResponse("Admin logout successful"),
            401: errorResponse("Unauthorized"),
            403: errorResponse("Admin access required"),
            500: errorResponse("Internal server error")
          }
        }
      },
      "/contactus": {
        post: {
          summary: "Submit contact form",
          tags: ["Contact"],
          requestBody: jsonBody({
            type: "object",
            properties: {
              name: { type: "string" },
              email: { type: "string", format: "email" },
              phone: { type: "string" },
              message: { type: "string" }
            }
          }),
          responses: {
            200: okResponse("Message sent successfully"),
            500: errorResponse("Internal server error")
          }
        }
      },
      "/newsletterSubscribe": {
        post: {
          summary: "Subscribe newsletter",
          tags: ["Contact"],
          requestBody: jsonBody({
            type: "object",
            properties: {
              email: {
                type: "string",
                format: "email"
              }
            }
          }),
          responses: {
            200: okResponse("Subscribed successfully"),
            500: errorResponse("Internal server error")
          }
        }
      },
      "/jobs/get-all-jobs": {
        get: {
          summary: "Get all jobs",
          tags: ["Jobs"],
          responses: {
            200: okResponse("Jobs fetched successfully"),
            500: errorResponse("Internal server error")
          }
        }
      },
      "/jobs/add": {
        post: {
          summary: "Add a new job",
          tags: ["Jobs"],
          requestBody: jsonBody({
            $ref: "#/components/schemas/JobRequest"
          }),
          responses: {
            201: okResponse("Job added successfully"),
            400: errorResponse("Required fields missing"),
            500: errorResponse("Internal server error")
          }
        }
      },
      "/jobs/{id}": {
        get: {
          summary: "Get job by ID",
          tags: ["Jobs"],
          parameters: [idParam("id", "Job ID")],
          responses: {
            200: okResponse("Job fetched successfully"),
            404: errorResponse("Job not found"),
            500: errorResponse("Internal server error")
          }
        },
        put: {
          summary: "Update job",
          tags: ["Jobs"],
          parameters: [idParam("id", "Job ID")],
          requestBody: jsonBody({
            $ref: "#/components/schemas/JobRequest"
          }),
          responses: {
            200: okResponse("Job updated successfully"),
            404: errorResponse("Job not found"),
            500: errorResponse("Internal server error")
          }
        },
        delete: {
          summary: "Delete job",
          tags: ["Jobs"],
          parameters: [idParam("id", "Job ID")],
          responses: {
            200: okResponse("Job deleted successfully"),
            404: errorResponse("Job not found"),
            500: errorResponse("Internal server error")
          }
        }
      },
      "/questions": {
        get: {
          summary: "Get questions",
          tags: ["Questions"],
          responses: {
            200: okResponse("Questions fetched successfully"),
            500: errorResponse("Internal server error")
          }
        },
        post: {
          summary: "Create question with testcases",
          tags: ["Questions"],
          security: bearerSecurity,
          requestBody: jsonBody({
            $ref: "#/components/schemas/QuestionRequest"
          }),
          responses: {
            201: okResponse("Question created successfully"),
            400: errorResponse("Validation error"),
            401: errorResponse("Unauthorized"),
            409: errorResponse("Duplicate slug"),
            500: errorResponse("Internal server error")
          }
        }
      },
      "/questions/{slug}": {
        get: {
          summary: "Get question by slug",
          tags: ["Questions"],
          parameters: [slugParam("Question slug")],
          responses: {
            200: okResponse("Question fetched successfully"),
            404: errorResponse("Question not found"),
            500: errorResponse("Internal server error")
          }
        }
      },
      "/run": {
        post: {
          summary: "Run code against custom testcases",
          tags: ["Run"],
          requestBody: jsonBody({
            $ref: "#/components/schemas/RunRequest"
          }),
          responses: {
            200: okResponse("Code executed"),
            400: errorResponse("Invalid run payload"),
            408: errorResponse("Execution timeout"),
            500: errorResponse("Runtime error"),
            503: errorResponse("Docker unavailable")
          }
        }
      },
      "/submit": {
        post: {
          summary: "Submit solution",
          tags: ["Submit"],
          security: optionalBearerSecurity,
          requestBody: jsonBody({
            $ref: "#/components/schemas/SubmitRequest"
          }),
          responses: {
            200: okResponse("Submission completed"),
            400: errorResponse("Invalid submit payload"),
            404: errorResponse("Question not found"),
            500: errorResponse("Runtime error"),
            503: errorResponse("Docker unavailable")
          }
        }
      },
      "/submit/{id}": {
        get: {
          summary: "Get submission by ID",
          tags: ["Submit"],
          parameters: [idParam("id", "Submission ID")],
          responses: {
            200: okResponse("Submission fetched successfully"),
            400: errorResponse("Invalid submission ID"),
            404: errorResponse("Submission not found"),
            500: errorResponse("Internal server error")
          }
        }
      },
      "/submissions": {
        get: {
          summary: "Get logged-in user's submissions",
          tags: ["Submit"],
          security: bearerSecurity,
          parameters: [
            {
              in: "query",
              name: "page",
              schema: { type: "integer", minimum: 1, default: 1 },
              description: "Page number"
            },
            {
              in: "query",
              name: "limit",
              schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
              description: "Items per page"
            }
          ],
          responses: {
            200: okResponse("Submission history fetched successfully"),
            401: errorResponse("Unauthorized"),
            500: errorResponse("Internal server error")
          }
        }
      },
      "/admin/submissions": {
        get: {
          summary: "Get all submissions for admin panel",
          tags: ["Admin"],
          security: bearerSecurity,
          parameters: [
            {
              in: "query",
              name: "page",
              schema: { type: "integer", minimum: 1, default: 1 },
              description: "Page number"
            },
            {
              in: "query",
              name: "limit",
              schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
              description: "Items per page"
            }
          ],
          responses: {
            200: okResponse("Submissions fetched successfully"),
            401: errorResponse("Unauthorized"),
            403: errorResponse("Admin access required"),
            500: errorResponse("Internal server error")
          }
        }
      },
      ...pageCrudPaths("/blog", "Blogs", "Blog"),
      ...pageCrudPaths("/interview", "Interviews", "Interview"),
      ...pageCrudPaths("/project", "Projects", "Project"),
      ...pageCrudPaths("/tutorial", "Tutorials", "Tutorial")
    },
  },
  apis: [],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

