import * as userService from './user.service.js';

const sudlorProfile = {
  login: 'KantaKan',
  id: 140788074,
  avatarUrl: 'https://avatars.githubusercontent.com/u/140788074?v=4',
  profileUrl: 'https://github.com/KantaKan',
  type: 'User',
  hireable: true,
  publicRepos: 95,
  publicGists: 0,
  followers: 32,
  following: 7,
  createdAt: '2023-07-28T06:03:45Z',
  updatedAt: '2026-09-14T03:48:06Z',
};

/**
 * User HTTP handlers bridge authenticated request data to user services.
 * Request schemas allow-list self-service fields before they reach these handlers.
 */
export function getSudlorProfile(req, res) {
  res.json({ success: true, data: sudlorProfile });
}

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
