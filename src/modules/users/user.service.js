import User from './user.model.js';
import { parsePagination, paginate } from '../../utils/pagination.js';
import { NotFoundError, ConflictError } from '../../utils/errors.js';
import { revokeAllUserSessions } from '../auth/auth.service.js';
import { escapeRegex } from '../../utils/search.js';

/** User database operations, including safe profile changes and embedded address management. */
export async function listUsers(query) {
  const pagination = parsePagination(query);
  const filter = {};
  if (query.role) filter.role = query.role;
  if (query.search) filter.$or = [{ name: new RegExp(escapeRegex(query.search), 'i') }, { email: new RegExp(escapeRegex(query.search), 'i') }];

  return paginate(User, filter, pagination);
}

export async function getUserById(id) {
  const user = await User.findById(id);
  if (!user) throw new NotFoundError('User not found');
  return user;
}

export async function updateUser(id, updates) {
  const user = await getUserById(id);
  Object.assign(user, updates);
  await user.save();
  if (Object.hasOwn(updates, 'role') || Object.hasOwn(updates, 'isActive')) await revokeAllUserSessions(user._id);
  return user;
}

export async function deleteUser(id) {
  const user = await User.findByIdAndDelete(id);
  if (!user) throw new NotFoundError('User not found');
  await revokeAllUserSessions(user._id);
  return user;
}

export async function addAddress(userId, address) {
  const user = await getUserById(userId);
  if (address.isDefault) user.addresses.forEach((a) => (a.isDefault = false));
  user.addresses.push(address);
  await user.save();
  return user;
}

export async function removeAddress(userId, addressId) {
  const user = await getUserById(userId);
  const before = user.addresses.length;
  user.addresses = user.addresses.filter((a) => a._id.toString() !== addressId);
  if (user.addresses.length === before) throw new NotFoundError('Address not found');
  await user.save();
  return user;
}

export async function assertEmailAvailable(email) {
  const existing = await User.findOne({ email });
  if (existing) throw new ConflictError('Email already in use');
}
