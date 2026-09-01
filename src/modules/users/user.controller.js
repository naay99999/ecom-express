import * as userService from './user.service.js';

/**
 * User HTTP handlers bridge authenticated request data to user services.
 * Request schemas allow-list self-service fields before they reach these handlers.
 */
export async function listUsers(req, res, next) {
  try {
    const { data, meta } = await userService.listUsers(req.query);
    res.json({ success: true, data, meta });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req, res, next) {
  try {
    const user = await userService.getUserById(req.user.id);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

export async function updateMe(req, res, next) {
  try {
    const user = await userService.updateUser(req.user.id, req.body);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

export async function getUser(req, res, next) {
  try {
    const user = await userService.getUserById(req.params.id);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req, res, next) {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req, res, next) {
  try {
    await userService.deleteUser(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function addAddress(req, res, next) {
  try {
    const user = await userService.addAddress(req.user.id, req.body);
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

export async function removeAddress(req, res, next) {
  try {
    const user = await userService.removeAddress(req.user.id, req.params.addressId);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}
