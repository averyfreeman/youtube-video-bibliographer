---
Title: "Are there more than 4 HTTP request methods?"
Date: "2026-06-23_05_06"
Tags:
  - Web Development
Category: "Web Development"
Source_Products:
  - AI_Mode
  - Search
---
---
HTTP Request Methods: Beyond the Basics
=====================================

While many developers are familiar with the four basic CRUD (Create, Read, Update, Delete) methods—GET, POST, PUT, and DELETE—the official IANA HTTP Method Registry recognizes over 30 distinct HTTP request methods. In this article, we will explore the 9 standard HTTP methods, extension methods, and how to craft an HTTP request for an upsert.

### The 9 Standard HTTP Methods

The foundational MDN Web Docs HTTP Reference outlines the nine standard methods defined for the modern web:

* GET: Requests data from a specified resource.
* POST: Submits data to be processed to a specified resource.
* PUT: Replaces all current representations of the target resource with the request payload.
* DELETE: Deletes the specified resource.
* PATCH: Applies partial modifications to a resource instead of replacing it entirely.
* HEAD: Asks for the same response header as a GET request, but without the response body.
* OPTIONS: Describes the communication options and permissions available for the target resource.
* CONNECT: Establishes a two-way tunnel to the server (often used for SSL/HTTPS proxies).
* TRACE: Performs a message loop-back test along the path to the target resource for debugging.

### Extension Methods

The architecture of HTTP allows for the creation of new verbs to support different application types. The most common extension is WebDAV (Web Distributed Authoring and Versioning), which adds advanced management verbs such as:

* LOCK / UNLOCK: Freezes a resource so others cannot edit it simultaneously.
* COPY / MOVE: Duplicates or relocates web resources.
* PROPFIND / PROPPATCH: Retrieves or changes metadata properties of a resource.

### Crafting an HTTP Request for an Upsert

To craft an HTTP request for an upsert (Update or Insert), you can use either the PUT or PATCH method. The choice between them depends entirely on whether your request body contains the complete resource or just a partial set of fields.

#### Option 1: The PUT Method (Full Replacement Upsert)

The PUT method is the standard HTTP verb for an upsert. It is designed to be idempotent, meaning that making the exact same request multiple times will yield the same result.

* Behavior: If the resource exists at the exact URL, the server overwrites it completely. If it does not exist, the server creates it.
* Requirement: The client must provide the entire resource object in the payload. Missing fields are usually wiped out or set to null by the server.

#### Option 2: The PATCH Method (Partial Update Upsert)

The PATCH method is used if you only want to send the specific fields you need to update or initialize, rather than the entire object.

* Behavior: If the resource exists, the server merges the fields into the existing record. If it does not exist, the server creates the record and applies default values to any missing fields.
* Caution: Unlike PUT, PATCH is not automatically guaranteed to be idempotent unless the server backend is intentionally designed to handle it that way.

### Key Implementation Details

* The URL Structure: Both methods require the unique identifier (e.g., `usr_987654321`) to be part of the URL path. This ensures the client dictates exactly where the resource should live.
* Server Response Codes: A well-designed API will return different HTTP status codes depending on which action the upsert took:
	+ 201 Created: Returned if the resource did not exist and was successfully built.
	+ 200 OK or 204 No Content: Returned if the resource already existed and was updated.

### Understanding Idempotency

In the context of HTTP and web APIs, idempotent means that making the exact same request multiple times will have the same effect on the server as making it just once. Repeated requests will not change the state of the database or resource any further after the initial execution.

#### How It Works in Practice

1. The First Request: The server processes the request and changes the data (e.g., creates or updates a record).
2. The Second (and Later) Requests: The server realizes the data already matches the request, so it does nothing new. The state of the resource remains identical to how it looked after the first request.

#### Why It Matters for an Upsert

Idempotency is a critical safety feature for API design, especially when networks are unstable. Handling network failures, such as a client sending a request to update a user profile and the server processing it successfully, but the network dropping before the server can send back a success message, requires idempotency to ensure safe retries.

#### Quick Comparison of Methods

* PUT (Idempotent): Calling PUT to set a user's name to "Alex" ten times results in the name being "Alex". The outcome never changes.
* POST (Non-Idempotent): Calling POST to "create an order" ten times will likely result in ten separate charges and ten different orders.

By understanding the different HTTP request methods and the concept of idempotency, you can design more robust and reliable APIs that handle upserts and other complex operations with ease.