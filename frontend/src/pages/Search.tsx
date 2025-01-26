import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Search as SearchIcon, Loader2, X, Filter, Eye } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface PreviewData {
  slide_number: number;
  image_url: string;
  text: string;
  metadata: Record<string, any>;
}

interface SearchResult {
  id: string;
  title: string;
  text: string;
  metadata: {
    agent_id: string;
    artifact_type: string;
    business_date: string;
    client_name: string;
    industry: string;
    is_client_specific: string;
    language: string;
    purpose: string;
    topic: string;
    [key: string]: any;
  };
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  applied_filters: Record<string, string>;
}

export default function Search() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingDoc, setEditingDoc] = useState<string | null>(null);
  const [editedMetadata, setEditedMetadata] = useState<Record<string, any>>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    language: '',
    business_date: '',
    is_client_specific: '',
    client_name: '',
    purpose: '',
    artifact_type: '',
    topic: '',
    industry: ''
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData[]>([]);
  const [loadingPreviews, setLoadingPreviews] = useState<Record<string, boolean>>({});
  const [isAnyPreviewLoading, setIsAnyPreviewLoading] = useState(false);

  const handleSearch = async () => {
    //if (!searchQuery.trim()) {
    //  setError('Please enter a search query');
    //  return;
    //}

    setIsLoading(true);
    setError(null);
    
    try {
      const activeFilters = Object.entries(filters).reduce((acc, [key, value]) => {
        if (value && value !== '_none') {  // Skip _none values
          acc[key] = value;  // Keep all values as strings
        }
        return acc;
      }, {} as Record<string, string>);  // All values are strings

      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          filters: activeFilters
        })
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data: SearchResponse = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error performing search:', error);
      setError(error instanceof Error ? error.message : 'Error performing search');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleMetadataUpdate = async (docId: string, metadata: any) => {
    setIsUpdating(true);
    try {
      // Find the current document to get its text
      const currentDoc = result?.results.find(doc => doc.id === docId);
      if (!currentDoc) {
        throw new Error('Document not found');
      }

      const response = await fetch('/api/update-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          doc_id: docId,
          metadata: metadata,
          text: currentDoc.text // Include the text in the update
        })
      });

      if (!response.ok) {
        throw new Error(`Update failed: ${response.statusText}`);
      }

      // Update the UI state directly
      if (result) {
        const updatedResults = result.results.map(doc => {
          if (doc.id === docId) {
            return {
              ...doc,
              metadata: metadata
            };
          }
          return doc;
        });

        setResult({
          ...result,
          results: updatedResults
        });
      }

      setEditingDoc(null);
      setEditedMetadata({});
    } catch (error) {
      console.error('Error updating document:', error);
      setError(error instanceof Error ? error.message : 'Error updating document');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStartEdit = (doc: SearchResult) => {
    setEditingDoc(doc.id);
    setEditedMetadata(doc.metadata);
  };

  const handleMetadataChange = (field: string, value: string) => {
    setEditedMetadata(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePreview = async (agentId: string) => {
    setLoadingPreviews(prev => ({ ...prev, [agentId]: true }));
    setIsAnyPreviewLoading(true);
    try {
      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: agentId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to load preview');
      }

      const data = await response.json();
      if (data.success && data.preview_data) {
        setPreviewData(data.preview_data);
        setPreviewOpen(true);
      }
    } catch (error) {
      console.error('Error loading preview:', error);
    } finally {
      setLoadingPreviews(prev => ({ ...prev, [agentId]: false }));
      setIsAnyPreviewLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen p-4">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mr-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Search</h1>
      </div>

      {/* Search Bar with Filter Toggle */}
      <div className="flex flex-col gap-2 mb-6">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full"
            />
          </div>
          <Button onClick={handleSearch} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <SearchIcon className="h-4 w-4 mr-2" />
            )}
            Search
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden"
          >
            <Filter className={`h-4 w-4 ${showFilters ? 'text-primary' : ''}`} />
          </Button>
        </div>

        {error && (
          <div className="bg-destructive/15 text-destructive px-4 py-2 rounded-md">
            {error}
          </div>
        )}
      </div>

      {/* Filters Section - Always visible on desktop, toggleable on mobile */}
      <div className={`${showFilters ? 'block' : 'hidden'} md:block transition-all duration-200 ease-in-out mb-6`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Language</Label>
            <div className="flex gap-2">
              <Select
                value={filters.language}
                onValueChange={(value) => setFilters({ ...filters, language: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="German">German</SelectItem>
                  <SelectItem value="Serbian">Serbian</SelectItem>
                </SelectContent>
              </Select>
              {filters.language && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFilters({ ...filters, language: '' })}
                  className="px-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Business Date</Label>
            <div className="flex gap-2">
              <Input
                type="month"
                value={filters.business_date}
                onChange={(e) => setFilters({ ...filters, business_date: e.target.value })}
              />
              {filters.business_date && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFilters({ ...filters, business_date: '' })}
                  className="px-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Client Specific</Label>
            <div className="flex gap-2">
              <Select
                value={filters.is_client_specific}
                onValueChange={(value) => setFilters({ ...filters, is_client_specific: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="True">Yes</SelectItem>
                  <SelectItem value="False">No</SelectItem>
                </SelectContent>
              </Select>
              {filters.is_client_specific && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFilters({ ...filters, is_client_specific: '' })}
                  className="px-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Client Name</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter client name"
                value={filters.client_name}
                onChange={(e) => setFilters({ ...filters, client_name: e.target.value })}
              />
              {filters.client_name && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFilters({ ...filters, client_name: '' })}
                  className="px-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Purpose</Label>
            <div className="flex gap-2">
              <Select
                value={filters.purpose}
                onValueChange={(value) => setFilters({ ...filters, purpose: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select purpose" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Value Delivery">Value Delivery</SelectItem>
                  <SelectItem value="Service QA">Service QA</SelectItem>
                  <SelectItem value="Employee Development">Employee Development</SelectItem>
                  <SelectItem value="PR & Marketing">PR & Marketing</SelectItem>
                  <SelectItem value="Sales & Business Development">Sales & Business Development</SelectItem>
                  <SelectItem value="Project Management">Project Management</SelectItem>
                </SelectContent>
              </Select>
              {filters.purpose && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFilters({ ...filters, purpose: '' })}
                  className="px-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Artifact Type</Label>
            <div className="flex gap-2">
              <Select
                value={filters.artifact_type}
                onValueChange={(value) => setFilters({ ...filters, artifact_type: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Analysis and Recommendations">Analysis and Recommendations</SelectItem>
                  <SelectItem value="Implementation Materials">Implementation Materials</SelectItem>
                  <SelectItem value="Solution Adoption Materials">Solution Adoption Materials</SelectItem>
                  <SelectItem value="Process Documentation">Process Documentation</SelectItem>
                  <SelectItem value="Templates and Tools">Templates and Tools</SelectItem>
                  <SelectItem value="References">References</SelectItem>
                  <SelectItem value="Client Requests">Client Requests</SelectItem>
                  <SelectItem value="Sales Proposals">Sales Proposals</SelectItem>
                  <SelectItem value="Thought Leadership Content">Thought Leadership Content</SelectItem>
                  <SelectItem value="Marketing Materials">Marketing Materials</SelectItem>
                  <SelectItem value="Project Documentation">Project Documentation</SelectItem>
                  <SelectItem value="Client Onboarding Materials">Client Onboarding Materials</SelectItem>
                  <SelectItem value="Publications">Publications</SelectItem>
                  <SelectItem value="Training Materials">Training Materials</SelectItem>
                  <SelectItem value="Other Development Materials">Other Development Materials</SelectItem>
                  <SelectItem value="Other Project Materials">Other Project Materials</SelectItem>
                  <SelectItem value="Other PR & Marketing Materials">Other PR & Marketing Materials</SelectItem>
                  <SelectItem value="Other Sales Materials">Other Sales Materials</SelectItem>
                  <SelectItem value="Other Quality Materials">Other Quality Materials</SelectItem>
                </SelectContent>
              </Select>
              {filters.artifact_type && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFilters({ ...filters, artifact_type: '' })}
                  className="px-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Topic</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter topic"
                value={filters.topic}
                onChange={(e) => setFilters({ ...filters, topic: e.target.value })}
              />
              {filters.topic && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFilters({ ...filters, topic: '' })}
                  className="px-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Industry</Label>
            <div className="flex gap-2">
              <Select
                value={filters.industry}
                onValueChange={(value) => setFilters({ ...filters, industry: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Accommodation Services">Accommodation Services</SelectItem>
                  <SelectItem value="Administrative and Support Services">Administrative and Support Services</SelectItem>
                  <SelectItem value="Construction">Construction</SelectItem>
                  <SelectItem value="Consumer Services">Consumer Services</SelectItem>
                  <SelectItem value="Education">Education</SelectItem>
                  <SelectItem value="Entertainment Providers">Entertainment Providers</SelectItem>
                  <SelectItem value="Farming, Ranching, Forestry">Farming, Ranching, Forestry</SelectItem>
                  <SelectItem value="Financial Services">Financial Services</SelectItem>
                  <SelectItem value="Government Administration">Government Administration</SelectItem>
                  <SelectItem value="Holding Companies">Holding Companies</SelectItem>
                  <SelectItem value="Hospitals and Health Care">Hospitals and Health Care</SelectItem>
                  <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="Oil, Gas, and Mining">Oil, Gas, and Mining</SelectItem>
                  <SelectItem value="Professional Services">Professional Services</SelectItem>
                  <SelectItem value="Real Estate and Equipment Rental Services">Real Estate and Equipment Rental Services</SelectItem>
                  <SelectItem value="Retail">Retail</SelectItem>
                  <SelectItem value="Technology, Information and Media">Technology, Information and Media</SelectItem>
                  <SelectItem value="Transportation, Logistics, Supply Chain and Storage">Transportation, Logistics, Supply Chain and Storage</SelectItem>
                  <SelectItem value="Utilities">Utilities</SelectItem>
                  <SelectItem value="Wholesale">Wholesale</SelectItem>
                  <SelectItem value="Not Specified">Not Specified</SelectItem>
                </SelectContent>
              </Select>
              {filters.industry && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFilters({ ...filters, industry: '' })}
                  className="px-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Results Area */}
      <ScrollArea className="flex-1 bg-muted rounded-lg p-4">
        {isLoading ? (
          <div className="flex h-[200px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : result ? (
          <div className="space-y-4">
            {result.total > 0 && (
              <div className="text-sm text-muted-foreground mb-2">
                Found {result.total} document{result.total === 1 ? '' : 's'}
              </div>
            )}
            {result.total === 0 ? (
              <div className="flex h-[200px] items-center justify-center">
                <p className="text-muted-foreground">No results found. Try adjusting your search or filters.</p>
              </div>
            ) : (
              result.results.map((doc) => (
                <Card key={doc.id}>
                  <CardHeader className="pb-2">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <div>
                        <CardTitle>{doc.title}</CardTitle>
                        <CardDescription className="mt-1.5">
                          {doc.text.length > 200 ? `${doc.text.slice(0, 200)}...` : doc.text}
                        </CardDescription>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {doc.metadata.is_client_specific === "True" && (
                          <Badge variant="default" className="px-3 py-1 font-medium">Client Specific</Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreview(doc.metadata.agent_id)}
                          disabled={isAnyPreviewLoading}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                          {loadingPreviews[doc.metadata.agent_id] && (
                            <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                          )}
                        </Button>
                        {editingDoc === doc.id ? (
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setEditingDoc(null);
                                setEditedMetadata({});
                              }}
                              disabled={isUpdating}
                            >
                              Cancel
                            </Button>
                            <Button 
                              variant="default" 
                              size="sm"
                              onClick={() => handleMetadataUpdate(doc.id, editedMetadata)}
                              disabled={isUpdating}
                            >
                              {isUpdating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Save'
                              )}
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleStartEdit(doc)}
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <Label className="text-muted-foreground">Client</Label>
                        {editingDoc === doc.id ? (
                          <Input
                            type="text"
                            value={editedMetadata.client_name || ''}
                            onChange={(e) => handleMetadataChange('client_name', e.target.value)}
                            className="h-8 text-sm bg-background"
                          />
                        ) : (
                          <p className="text-sm font-medium">{doc.metadata.client_name}</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label className="text-muted-foreground">Purpose</Label>
                        {editingDoc === doc.id ? (
                          <Select
                            value={editedMetadata.purpose || ''}
                            onValueChange={(value) => handleMetadataChange('purpose', value)}
                          >
                            <SelectTrigger className="h-8 text-sm bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Value Delivery">Value Delivery</SelectItem>
                              <SelectItem value="Service QA">Service QA</SelectItem>
                              <SelectItem value="Employee Development">Employee Development</SelectItem>
                              <SelectItem value="PR & Marketing">PR & Marketing</SelectItem>
                              <SelectItem value="Sales & Business Development">Sales & Business Development</SelectItem>
                              <SelectItem value="Project Management">Project Management</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-sm font-medium">{doc.metadata.purpose}</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label className="text-muted-foreground">Type</Label>
                        {editingDoc === doc.id ? (
                          <Select
                            value={editedMetadata.artifact_type || ''}
                            onValueChange={(value) => handleMetadataChange('artifact_type', value)}
                          >
                            <SelectTrigger className="h-8 text-sm bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Analysis and Recommendations">Analysis and Recommendations</SelectItem>
                              <SelectItem value="Implementation Materials">Implementation Materials</SelectItem>
                              <SelectItem value="Solution Adoption Materials">Solution Adoption Materials</SelectItem>
                              <SelectItem value="Process Documentation">Process Documentation</SelectItem>
                              <SelectItem value="Templates and Tools">Templates and Tools</SelectItem>
                              <SelectItem value="References">References</SelectItem>
                              <SelectItem value="Client Requests">Client Requests</SelectItem>
                              <SelectItem value="Sales Proposals">Sales Proposals</SelectItem>
                              <SelectItem value="Thought Leadership Content">Thought Leadership Content</SelectItem>
                              <SelectItem value="Marketing Materials">Marketing Materials</SelectItem>
                              <SelectItem value="Project Documentation">Project Documentation</SelectItem>
                              <SelectItem value="Client Onboarding Materials">Client Onboarding Materials</SelectItem>
                              <SelectItem value="Publications">Publications</SelectItem>
                              <SelectItem value="Training Materials">Training Materials</SelectItem>
                              <SelectItem value="Other Development Materials">Other Development Materials</SelectItem>
                              <SelectItem value="Other Project Materials">Other Project Materials</SelectItem>
                              <SelectItem value="Other PR & Marketing Materials">Other PR & Marketing Materials</SelectItem>
                              <SelectItem value="Other Sales Materials">Other Sales Materials</SelectItem>
                              <SelectItem value="Other Quality Materials">Other Quality Materials</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-sm font-medium">{doc.metadata.artifact_type}</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label className="text-muted-foreground">Date</Label>
                        {editingDoc === doc.id ? (
                          <Input
                            type="month"
                            value={editedMetadata.business_date || ''}
                            onChange={(e) => handleMetadataChange('business_date', e.target.value)}
                            className="h-8 text-sm bg-background"
                          />
                        ) : (
                          <p className="text-sm font-medium">{doc.metadata.business_date}</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label className="text-muted-foreground">Language</Label>
                        {editingDoc === doc.id ? (
                          <Select
                            value={editedMetadata.language || ''}
                            onValueChange={(value) => handleMetadataChange('language', value)}
                          >
                            <SelectTrigger className="h-8 text-sm bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="English">English</SelectItem>
                              <SelectItem value="German">German</SelectItem>
                              <SelectItem value="Serbian">Serbian</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-sm font-medium">{doc.metadata.language}</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label className="text-muted-foreground">Industry</Label>
                        {editingDoc === doc.id ? (
                          <Select
                            value={editedMetadata.industry || ''}
                            onValueChange={(value) => handleMetadataChange('industry', value)}
                          >
                            <SelectTrigger className="h-8 text-sm bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Accommodation Services">Accommodation Services</SelectItem>
                              <SelectItem value="Administrative and Support Services">Administrative and Support Services</SelectItem>
                              <SelectItem value="Construction">Construction</SelectItem>
                              <SelectItem value="Consumer Services">Consumer Services</SelectItem>
                              <SelectItem value="Education">Education</SelectItem>
                              <SelectItem value="Entertainment Providers">Entertainment Providers</SelectItem>
                              <SelectItem value="Farming, Ranching, Forestry">Farming, Ranching, Forestry</SelectItem>
                              <SelectItem value="Financial Services">Financial Services</SelectItem>
                              <SelectItem value="Government Administration">Government Administration</SelectItem>
                              <SelectItem value="Holding Companies">Holding Companies</SelectItem>
                              <SelectItem value="Hospitals and Health Care">Hospitals and Health Care</SelectItem>
                              <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                              <SelectItem value="Oil, Gas, and Mining">Oil, Gas, and Mining</SelectItem>
                              <SelectItem value="Professional Services">Professional Services</SelectItem>
                              <SelectItem value="Real Estate and Equipment Rental Services">Real Estate and Equipment Rental Services</SelectItem>
                              <SelectItem value="Retail">Retail</SelectItem>
                              <SelectItem value="Technology, Information and Media">Technology, Information and Media</SelectItem>
                              <SelectItem value="Transportation, Logistics, Supply Chain and Storage">Transportation, Logistics, Supply Chain and Storage</SelectItem>
                              <SelectItem value="Utilities">Utilities</SelectItem>
                              <SelectItem value="Wholesale">Wholesale</SelectItem>
                              <SelectItem value="Not Specified">Not Specified</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-sm font-medium">{doc.metadata.industry}</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label className="text-muted-foreground">Topic</Label>
                        {editingDoc === doc.id ? (
                          <Input
                            type="text"
                            value={editedMetadata.topic || ''}
                            onChange={(e) => handleMetadataChange('topic', e.target.value)}
                            className="h-8 text-sm bg-background"
                          />
                        ) : (
                          <p className="text-sm font-medium">{doc.metadata.topic}</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label className="text-muted-foreground">Client Specific</Label>
                        {editingDoc === doc.id ? (
                          <Select
                            value={editedMetadata.is_client_specific || ''}
                            onValueChange={(value) => handleMetadataChange('is_client_specific', value)}
                          >
                            <SelectTrigger className="h-8 text-sm bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="True">Yes</SelectItem>
                              <SelectItem value="False">No</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-sm font-medium">{doc.metadata.is_client_specific === "True" ? "Yes" : "No"}</p>
                        )}
                      </div>

                      {(editingDoc === doc.id || doc.metadata.comment) && (
                        <div className="col-span-2 md:col-span-4 space-y-1">
                          <Label className="text-muted-foreground">Comment</Label>
                          {editingDoc === doc.id ? (
                            <Input
                              type="text"
                              value={editedMetadata.comment || ''}
                              onChange={(e) => handleMetadataChange('comment', e.target.value)}
                              className="h-8 text-sm bg-background"
                              placeholder="Add a comment..."
                            />
                          ) : (
                            <p className="text-sm font-medium">{doc.metadata.comment}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : (
          <div className="flex h-[200px] items-center justify-center">
            <p className="text-muted-foreground">No results yet. Use the search bar and filters above to find documents.</p>
          </div>
        )}
      </ScrollArea>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl h-[90vh] p-2 sm:p-4">
          <DialogHeader className="sm:mb-2">
            <DialogTitle>Document Preview</DialogTitle>
            <DialogDescription>
              Preview the document slides
            </DialogDescription>
          </DialogHeader>
          
          {previewData.length > 0 ? (
            <div className="relative h-[calc(100%-6rem)] flex items-center justify-center">
              <Carousel className="w-full max-w-[85vw] sm:max-w-3xl mx-auto">
                <CarouselContent>
                  {previewData.map((slide, index) => (
                    <CarouselItem key={index} className="flex flex-col items-center justify-center">
                      <img 
                        src={slide.image_url} 
                        alt={`Slide ${slide.slide_number}`}
                        className="max-h-[45vh] sm:max-h-[60vh] w-auto object-contain"
                      />
                      <p className="text-sm text-muted-foreground mt-2">
                        Slide {slide.slide_number}/{previewData.length}
                      </p>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <div className="hidden sm:block">
                  <CarouselPrevious className="ml-4" />
                  <CarouselNext className="mr-4" />
                </div>
                <div className="sm:hidden">
                  <CarouselPrevious className="-ml-3" />
                  <CarouselNext className="-mr-3" />
                </div>
              </Carousel>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48">
              <p className="text-muted-foreground">No preview available</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 