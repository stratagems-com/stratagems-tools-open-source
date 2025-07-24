import { Request, Response } from 'express';
import { UserService } from '../../services/user.service';
import { prisma } from '../../utils/database';
import { validateSchema } from '../../utils/validator';
import {
    acceptInvitationSchema,
    createUserSchema,
    inviteUserSchema,
    updateUserSchema,
} from '../../validations/user.validation';

const userService = new UserService(prisma);

export const inviteUser = async (req: Request, res: Response) => {
    try {
        const { body } = validateSchema(req, { body: inviteUserSchema.shape.body });
        const invitation = await userService.inviteUser(body.email, req.user!.id);
        res.status(201).json({
            message: 'Invitation sent successfully',
            invitation,
        });
    } catch (error) {
        console.error('Invite user error:', error);
        res.status(500).json({ error: 'Failed to invite user' });
    }
};

export const acceptInvitation = async (req: Request, res: Response) => {
    try {
        const { body } = validateSchema(req, { body: acceptInvitationSchema.shape.body });
        const user = await userService.acceptInvitation(body.token, body);
        res.status(201).json({
            message: 'Invitation accepted successfully',
            user,
        });
    } catch (error) {
        console.error('Accept invitation error:', error);
        res.status(400).json({ error: (error as Error).message });
    }
};

export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await userService.getUsers();
        res.json({ users });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
};

export const getUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        const user = await userService.getUserById(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
};

export const updateUser = async (req: Request, res: Response) => {
    try {
        const { body } = validateSchema(req, { body: updateUserSchema.shape.body });
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        const user = await userService.updateUser(id, body as Partial<import('@prisma/client').User>);
        res.json({
            message: 'User updated successfully',
            user,
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        await userService.deleteUser(id);
        res.json({ 
            success: true,
            message: 'User deleted successfully' 
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to delete user' 
        });
    }
};

export const createUser = async (req: Request, res: Response) => {
    try {
        const { body } = validateSchema(req, { body: createUserSchema.shape.body });
        const user = await userService.createUser(body);
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: user,
        });
    } catch (error) {
        console.error('Create user error:', error);
        if (error instanceof Error && error.message.includes('already exists')) {
            res.status(409).json({ 
                success: false,
                error: error.message 
            });
        } else {
            res.status(500).json({ 
                success: false,
                error: 'Failed to create user' 
            });
        }
    }
};

export const toggleUserStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ 
                success: false,
                error: 'User ID is required' 
            });
        }
        
        const user = await userService.toggleUserStatus(id);
        res.json({
            success: true,
            message: user.isActive ? 'User activated successfully' : 'User deactivated successfully',
            data: user,
        });
    } catch (error) {
        console.error('Toggle user status error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to toggle user status' 
        });
    }
};

export const resetUserPassword = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ 
                success: false,
                error: 'User ID is required' 
            });
        }
        
        const result = await userService.resetUserPassword(id);
        res.json({
            success: true,
            message: 'User password has been reset. A temporary password has been generated.',
            data: result,
        });
    } catch (error) {
        console.error('Reset user password error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to reset user password' 
        });
    }
};