import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, Search, Edit, Trash2, AlertCircle, 
  Tag, IndianRupee, ArrowLeft, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const CATEGORY_GROUPS = [
  'Travel Expenses',
  'Food Expenses',
  'Hotel Accommodation',
  'MISC',
  'Torch Bearer',
  'Sales Promotion',
  'Others'
];

export default function AdminCategories() {
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    category_name: '',
    title: '',
    claim_type: 'Domestic',
    bill_required: true,
    description: '',
    policy_limit: '',
    is_sales_promotion: false,
    is_torch_bearer: false,
    is_active: true,
    sort_order: 0,
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories-admin'],
    queryFn: () => base44.entities.Category.list('category_name'),
  });

  const filteredCategories = categories.filter(cat => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return cat.category_name?.toLowerCase().includes(searchLower) ||
           cat.title?.toLowerCase().includes(searchLower);
  });

  const groupedCategories = filteredCategories.reduce((acc, cat) => {
    const group = cat.category_name || 'Others';
    if (!acc[group]) acc[group] = [];
    acc[group].push(cat);
    return acc;
  }, {});

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Category.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['categories-admin']);
      toast.success('Category created successfully');
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Category.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['categories-admin']);
      toast.success('Category updated successfully');
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Category.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['categories-admin']);
      toast.success('Category deleted');
    },
  });

  const openModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        category_name: category.category_name || '',
        title: category.title || '',
        claim_type: category.claim_type || 'Domestic',
        bill_required: category.bill_required ?? true,
        description: category.description || '',
        policy_limit: category.policy_limit || '',
        is_sales_promotion: category.is_sales_promotion || false,
        is_torch_bearer: category.is_torch_bearer || false,
        is_active: category.is_active ?? true,
        sort_order: category.sort_order || 0,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        category_name: '',
        title: '',
        claim_type: 'Domestic',
        bill_required: true,
        description: '',
        policy_limit: '',
        is_sales_promotion: false,
        is_torch_bearer: false,
        is_active: true,
        sort_order: 0,
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
  };

  const handleSubmit = () => {
    if (!formData.category_name || !formData.title) {
      toast.error('Category name and title are required');
      return;
    }

    const data = {
      ...formData,
      policy_limit: formData.policy_limit ? parseFloat(formData.policy_limit) : null,
    };

    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (category) => {
    if (window.confirm(`Delete "${category.title}" category?`)) {
      deleteMutation.mutate(category.id);
    }
  };

  const userRole = user?.portal_role;
  if (userRole !== 'admin_head' && userRole !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-amber-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h1>
          <p className="text-gray-500">Only Admin Head can manage categories.</p>
          <Link to={createPageUrl('Dashboard')}>
            <Button className="mt-6" variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Expense Categories</h1>
            <p className="text-gray-500 mt-1">
              Manage expense categories and policy limits
            </p>
          </div>
          <Button 
            onClick={() => openModal()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        </div>

        {/* Search */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Categories by Group */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedCategories).map(([group, cats]) => (
              <Card key={group} className="border-0 shadow-sm overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 py-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Tag className="w-4 h-4 text-blue-600" />
                    {group}
                    <Badge variant="secondary" className="ml-2">
                      {cats.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50">
                        <TableHead>Title</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Bill Required</TableHead>
                        <TableHead>Policy Limit</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {cats.map((cat) => (
                          <motion.tr
                            key={cat.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="border-b hover:bg-gray-50"
                          >
                            <TableCell>
                              <div>
                                <p className="font-medium">{cat.title}</p>
                                {cat.description && (
                                  <p className="text-xs text-gray-500 line-clamp-1">
                                    {cat.description}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {cat.claim_type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {cat.bill_required ? (
                                <Badge className="bg-green-100 text-green-700">Yes</Badge>
                              ) : (
                                <Badge className="bg-gray-100 text-gray-600">No</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {cat.policy_limit ? (
                                <span className="flex items-center gap-1 font-medium">
                                  <IndianRupee className="w-3 h-3" />
                                  {cat.policy_limit.toLocaleString('en-IN')}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {cat.is_active ? (
                                <Badge className="bg-green-100 text-green-700">Active</Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-700">Inactive</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openModal(cat)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleDelete(cat)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Category Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory 
                ? 'Update the category details below'
                : 'Fill in the details for the new expense category'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category Group *</Label>
                <Select 
                  value={formData.category_name} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, category_name: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_GROUPS.map(group => (
                      <SelectItem key={group} value={group}>{group}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  placeholder="e.g., Rail, Ola/Uber"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Claim Type</Label>
                <Select 
                  value={formData.claim_type} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, claim_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Domestic">Domestic</SelectItem>
                    <SelectItem value="International">International</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Policy Limit (₹)</Label>
                <Input
                  type="number"
                  placeholder="Optional"
                  value={formData.policy_limit}
                  onChange={(e) => setFormData(prev => ({ ...prev, policy_limit: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Add a description..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Bill Required</Label>
                  <p className="text-xs text-gray-500">Require document upload</p>
                </div>
                <Switch
                  checked={formData.bill_required}
                  onCheckedChange={(v) => setFormData(prev => ({ ...prev, bill_required: v }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Sales Promotion Category</Label>
                  <p className="text-xs text-gray-500">Uses CRO/CFO approval flow</p>
                </div>
                <Switch
                  checked={formData.is_sales_promotion}
                  onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_sales_promotion: v }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Torch Bearer Category</Label>
                  <p className="text-xs text-gray-500">Skips HOD in approval flow</p>
                </div>
                <Switch
                  checked={formData.is_torch_bearer}
                  onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_torch_bearer: v }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Active</Label>
                  <p className="text-xs text-gray-500">Available for selection</p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_active: v }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editingCategory ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}